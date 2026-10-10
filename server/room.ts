import type { DatabaseSync } from "node:sqlite";
import { Server, Socket } from "socket.io";
import { verifyInitData } from "./auth.ts";
import { initGame } from "./decks.ts";
import { applyBuy, applyBuyout, applyRent, applyRepair, applyTaxi } from "./actions.ts";
import { d6 } from "./rng.ts";
import { saveRoom, serializeRoom } from "./snapshot.ts";
import { advanceTurn, applyAutoTurn, applyMove, assertIntent, RuleError, TURN_TIMEOUT_SEC, DISCONNECT_TIMEOUT_SEC, DISCONNECT_GRACE_SEC } from "./turn.ts";
import { applyBid, applyAuctionPass, startAuction, AUCTION_TIMEOUT_SEC } from "./auction.ts";
import { inviteRace, acceptRace, forfeitRace, joinRacePool, resolveRace, RACE_POOL_TIMEOUT_SEC } from "./race.ts";
import { grantLoan } from "./loans.ts";
import { MAX_PLAYERS, MIN_PLAYERS, type Intent, type Room } from "./types.ts";

export type LobbyUser = { id: string; name: string; socketId: string };

export type ActiveRoomState = {
  room: Room;
  timer: NodeJS.Timeout | null;
  disconnectTimers: Map<string, NodeJS.Timeout>; // userId -> grace timer
  activeSockets: Map<string, string>; // userId -> socketId
};

export class RoomManager {
  private io: Server;
  private db: DatabaseSync | null;
  private botToken: string;
  private rooms = new Map<string, ActiveRoomState>();
  private lobbies = new Map<string, LobbyUser[]>();

  constructor(io: Server, db: DatabaseSync | null, botToken: string) {
    this.io = io;
    this.db = db;
    this.botToken = botToken;
  }


  public getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId)?.room ?? null;
  }

  public getLobby(roomId: string): LobbyUser[] {
    return this.lobbies.get(roomId) ?? [];
  }

  public registerSocket(socket: Socket): void {
    let authUser: { id: string; name: string } | null = null;
    let currentRoomId: string | null = null;

    socket.on("auth", (payload: { initData: string; roomId: string }, ack?: (res: any) => void) => {
      try {
        const user = verifyInitData(payload.initData, this.botToken);
        authUser = user;
        currentRoomId = payload.roomId;
        socket.join(payload.roomId);

        // Check if game already running
        const active = this.rooms.get(payload.roomId);
        if (active) {
          active.activeSockets.set(user.id, socket.id);
          const dcTimer = active.disconnectTimers.get(user.id);
          if (dcTimer) {
            clearTimeout(dcTimer);
            active.disconnectTimers.delete(user.id);
          }
          socket.emit("room:state", serializeRoom(active.room));
          if (ack) ack({ ok: true, state: "playing" });
          return;
        }

        // Otherwise lobby
        this.joinLobby(payload.roomId, user, socket.id);
        if (ack) ack({ ok: true, state: "lobby" });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on("intent", (intent: Intent, ack?: (res: any) => void) => {
      if (!authUser || !currentRoomId) {
        if (ack) ack({ ok: false, error: "unauthenticated" });
        return;
      }
      try {
        this.handleIntent(currentRoomId, authUser.id, intent);
        if (ack) ack({ ok: true });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on("lobby:start", (ack?: (res: any) => void) => {
      if (!authUser || !currentRoomId) {
        if (ack) ack({ ok: false, error: "unauthenticated" });
        return;
      }
      try {
        this.startGame(currentRoomId, authUser.id);
        if (ack) ack({ ok: true });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    socket.on("disconnect", () => {
      if (!authUser || !currentRoomId) return;
      const roomId = currentRoomId;
      const userId = authUser.id;

      // If in lobby, remove from lobby
      const lobby = this.lobbies.get(roomId);
      if (lobby) {
        this.lobbies.set(
          roomId,
          lobby.filter((u) => u.id !== userId),
        );
        this.io.to(roomId).emit("lobby:update", this.lobbies.get(roomId));
        return;
      }

      // If in active room, handle disconnect grace
      const active = this.rooms.get(roomId);
      if (active) {
        active.activeSockets.delete(userId);
        this.handlePlayerDisconnect(roomId, userId);
      }
    });
  }

  public joinLobby(roomId: string, user: { id: string; name: string }, socketId: string): void {
    const list = this.lobbies.get(roomId) ?? [];
    if (list.length >= MAX_PLAYERS) throw new RuleError("lobby is full");
    const existing = list.findIndex((u) => u.id === user.id);
    if (existing >= 0) {
      list[existing] = { ...user, socketId };
    } else {
      list.push({ ...user, socketId });
    }
    this.lobbies.set(roomId, list);
    this.io.to(roomId).emit("lobby:update", list);
  }

  public startGame(roomId: string, requesterId: string): Room {
    const lobby = this.lobbies.get(roomId);
    if (!lobby || lobby.length < MIN_PLAYERS) {
      throw new RuleError(`need at least ${MIN_PLAYERS} players`);
    }
    const host = lobby[0];
    if (host?.id !== requesterId) {
      throw new RuleError("only lobby host can start");
    }

    const room = initGame(roomId, lobby);
    this.lobbies.delete(roomId);

    const activeSockets = new Map<string, string>();
    for (const u of lobby) {
      activeSockets.set(u.id, u.socketId);
    }

    const active: ActiveRoomState = {
      room,
      timer: null,
      disconnectTimers: new Map(),
      activeSockets,
    };
    this.rooms.set(roomId, active);

    this.scheduleTurnTimer(roomId, TURN_TIMEOUT_SEC);
    this.broadcastState(roomId);
    return room;
  }

  public handleIntent(roomId: string, playerId: string, intent: Intent): void {
    const active = this.rooms.get(roomId);
    if (!active) throw new RuleError("room not found");
    assertIntent(active.room, playerId, intent);

    let nextRoom = active.room;
    switch (intent.type) {
      case "move":
        nextRoom = applyMove(active.room, intent.steps);
        // If landed on retro, automatically start auction for top retro card
        if (nextRoom.phase.name === "resolve_cell" && nextRoom.phase.cell === "retro") {
          const retroCard = nextRoom.decks.retro[0];
          if (retroCard) {
            nextRoom = {
              ...nextRoom,
              decks: { ...nextRoom.decks, retro: nextRoom.decks.retro.slice(1) },
            };
            nextRoom = startAuction(nextRoom, retroCard);
            this.scheduleTurnTimer(roomId, AUCTION_TIMEOUT_SEC);
          }
        }
        break;
      case "buy":
        nextRoom = applyBuy(active.room, intent.carId);
        nextRoom = advanceTurn(nextRoom, false);
        break;
      case "repair":
        const car = active.room.players
          .find((p) => p.id === playerId)
          ?.cars.find((c) => c.id === intent.carId);
        const roll = car?.defect.kind === "roll" ? d6() : 0;
        nextRoom = applyRepair(active.room, intent.carId, roll);
        break;
      case "rent":
        nextRoom = applyRent(active.room);
        nextRoom = advanceTurn(nextRoom, false);
        break;
      case "taxi":
        nextRoom = applyTaxi(active.room, intent.carId, d6());
        nextRoom = advanceTurn(nextRoom, false);
        break;
      case "bid":
        nextRoom = applyBid(active.room, playerId, intent.step);
        this.scheduleTurnTimer(roomId, AUCTION_TIMEOUT_SEC);
        break;
      case "pass":
        if (active.room.phase.name === "auction") {
          const res = applyAuctionPass(active.room, playerId);
          nextRoom = res.room;
          if (res.ended) {
            nextRoom = advanceTurn(nextRoom, false);
          } else {
            this.scheduleTurnTimer(roomId, AUCTION_TIMEOUT_SEC);
          }
        } else if (active.room.phase.name === "race" && active.room.phase.state.status === "pool_entry") {
          // Pass on pool entry
          break;
        } else {
          nextRoom = advanceTurn(active.room, false);
        }
        break;
      case "race_invite":
        nextRoom = inviteRace(active.room, playerId, intent.targetId, intent.stake);
        this.scheduleTurnTimer(roomId, 10);
        break;
      case "race_accept":
        nextRoom = acceptRace(active.room, playerId);
        this.scheduleTurnTimer(roomId, RACE_POOL_TIMEOUT_SEC);
        break;
      case "race_forfeit":
        nextRoom = forfeitRace(active.room, playerId);
        nextRoom = advanceTurn(nextRoom, false);
        break;
      case "race_join_pool":
        nextRoom = joinRacePool(active.room, playerId);
        break;
      case "loan_offer":
        nextRoom = grantLoan(
          active.room,
          playerId,
          intent.targetId,
          intent.principal,
          intent.due,
          intent.turns,
        );
        break;
      default:
        throw new RuleError(`unsupported intent: ${(intent as any).type}`);
    }

    this.updateRoom(roomId, nextRoom);
  }

  private updateRoom(roomId: string, nextRoom: Room): void {
    const active = this.rooms.get(roomId);
    if (!active) return;
    const oldTurn = active.room.turn;
    const turnChanged = nextRoom.turn !== oldTurn || nextRoom.phase.name === "finished";

    active.room = nextRoom;

    if (turnChanged) {
      if (this.db) {
        saveRoom(this.db, nextRoom);
      }
      if (nextRoom.phase.name === "finished") {
        if (active.timer) clearTimeout(active.timer);
        active.timer = null;
      } else {
        this.scheduleTurnTimer(roomId, TURN_TIMEOUT_SEC);
      }
    }

    this.broadcastState(roomId);
  }

  public scheduleTurnTimer(roomId: string, seconds: number): void {
    const active = this.rooms.get(roomId);
    if (!active) return;
    if (active.timer) clearTimeout(active.timer);

    active.timer = setTimeout(() => {
      this.handleTurnTimeout(roomId);
    }, seconds * 1000);
  }

  public handleTurnTimeout(roomId: string): void {
    const active = this.rooms.get(roomId);
    if (!active || active.room.phase.name === "finished") return;

    if (active.room.phase.name === "auction") {
      // Auto-pass current bidder
      const currentBidderId = active.room.phase.state.currentTurnPlayerId;
      const res = applyAuctionPass(active.room, currentBidderId);
      let nextRoom = res.room;
      if (res.ended) {
        nextRoom = advanceTurn(nextRoom, false);
      } else {
        this.scheduleTurnTimer(roomId, AUCTION_TIMEOUT_SEC);
      }
      this.updateRoom(roomId, nextRoom);
      return;
    }

    if (active.room.phase.name === "race") {
      if (active.room.phase.state.status === "invitation") {
        // Auto-forfeit on timeout
        const nextRoom = advanceTurn(forfeitRace(active.room, active.room.phase.state.targetId), false);
        this.updateRoom(roomId, nextRoom);
        return;
      }
      if (active.room.phase.state.status === "pool_entry") {
        // Pool entry closed: roll dice and resolve race
        const { room: nextRoom } = resolveRace(active.room, d6);
        this.updateRoom(roomId, advanceTurn(nextRoom, false));
        return;
      }
    }

    const nextRoom = applyAutoTurn(active.room, d6());
    this.updateRoom(roomId, nextRoom);
  }

  private handlePlayerDisconnect(roomId: string, userId: string): void {
    const active = this.rooms.get(roomId);
    if (!active) return;

    // After DISCONNECT_GRACE_SEC (10s), if still active turn of this player, speed up timer to 5s
    const graceTimer = setTimeout(() => {
      active.disconnectTimers.delete(userId);
      const currentPlayer = active.room.players[active.room.turn];
      if (currentPlayer?.id === userId) {
        this.scheduleTurnTimer(roomId, DISCONNECT_TIMEOUT_SEC);
      }
    }, DISCONNECT_GRACE_SEC * 1000);

    active.disconnectTimers.set(userId, graceTimer);
  }

  private broadcastState(roomId: string): void {
    const active = this.rooms.get(roomId);
    if (!active) return;
    this.io.to(roomId).emit("room:state", serializeRoom(active.room));
  }

  public close(): void {
    for (const active of this.rooms.values()) {
      if (active.timer) clearTimeout(active.timer);
      for (const t of active.disconnectTimers.values()) clearTimeout(t);
    }
    this.rooms.clear();
    this.lobbies.clear();
  }
}
