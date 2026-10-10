import { canPay, EXTRA_STEP_COST, sub, euro } from "./money.ts";
import { cellAt, CELL_CAP, stepCost, stepsWalked, TRACK_LEN } from "./track.ts";
import { GARAGE_CAP, type Intent, type Player, type Room } from "./types.ts";
import { processPlayerLoansAtTurnEnd } from "./loans.ts";

export class RuleError extends Error {}

const seat = (room: Room): Player => {
  const player = room.players[room.turn];
  if (!player || player.bankrupt) throw new RuleError("no active player");
  return player;
};

const occupied = (room: Room, index: number): number =>
  room.players.filter((p) => !p.bankrupt && p.position === index).length;

/** choose_move → resolve_cell. Charges steps over 2, blocks a full cell. */
export const applyMove = (room: Room, steps: 1 | 2 | 3 | 4): Room => {
  if (room.phase.name !== "choose_move") throw new RuleError("not choose_move");
  const player = seat(room);
  const cost = EXTRA_STEP_COST * BigInt(Math.max(0, steps - 2));
  if (cost !== BigInt(stepCost(steps))) throw new RuleError("step cost drifted");
  if (!canPay(player.cash, cost)) throw new RuleError("cannot pay the jump");

  const from = player.position;
  const to = (from + steps) % TRACK_LEN;
  if (occupied(room, to) >= CELL_CAP) throw new RuleError("cell is full");
  const walked = stepsWalked(from, to);

  const next: Player = {
    ...player,
    cash: sub(player.cash, cost),
    position: to,
    cars: player.cars.map((c) =>
      c.status === "in_rent" && c.rentSteps !== undefined
        ? { ...c, rentSteps: c.rentSteps + walked }
        : c,
    ),
  };
  return {
    ...room,
    players: room.players.map((p) => (p.id === player.id ? next : p)),
    phase: { name: "resolve_cell", cell: cellAt(to) },
  };
};

export const WIN_CASH = euro(32_000);
export const TURN_TIMEOUT_SEC = 30;
export const DISCONNECT_TIMEOUT_SEC = 5;
export const DISCONNECT_GRACE_SEC = 10;
export const MAX_MISSED_LAPS = 3;

/** Checks if a player has met victory conditions. */
export const checkWin = (player: Player): boolean =>
  player.cash >= WIN_CASH && player.loans.length === 0;

/** Advances turn to next non-bankrupt player. Increments missedLaps if timeout, checks bankruptcy. */
export const advanceTurn = (room: Room, wasAuto = false): Room => {
  const activeCount = room.players.filter((p) => !p.bankrupt).length;
  if (activeCount <= 1) {
    const winner = room.players.find((p) => !p.bankrupt);
    return {
      ...room,
      phase: { name: "finished", winnerId: winner?.id ?? "" },
      updatedAt: Date.now(),
    };
  }

  const current = seat(room);
  let updatedCurrent = { ...current, turnCount: current.turnCount + 1 };

  // Process loans for the player ending their turn
  const loanProcessedRoom = processPlayerLoansAtTurnEnd(room, current.id);
  const postLoanPlayer = loanProcessedRoom.players.find((p) => p.id === current.id)!;
  updatedCurrent = { ...postLoanPlayer, turnCount: postLoanPlayer.turnCount + 1 };

  // Track missed turns / bankruptcy (RULES: 3 missed laps -> bankrupt)
  if (wasAuto) {
    const missed = updatedCurrent.missedLaps + 1;
    if (missed >= MAX_MISSED_LAPS) {
      // Player bankrupt: cars burn to discards, loans cancelled
      updatedCurrent = { ...updatedCurrent, bankrupt: true, missedLaps: missed };
    } else {
      updatedCurrent = { ...updatedCurrent, missedLaps: missed };
    }
  } else {
    updatedCurrent = { ...updatedCurrent, missedLaps: 0 };
  }

  let nextPlayers = room.players.map((p) => (p.id === current.id ? updatedCurrent : p));

  // If player went bankrupt, put their cars into discards
  let discards = room.discards;
  if (updatedCurrent.bankrupt) {
    const newDiscards = { ...room.discards };
    for (const car of current.cars) {
      newDiscards[car.class] = [...newDiscards[car.class], car];
    }
    updatedCurrent.cars = [];
    nextPlayers = room.players.map((p) => (p.id === current.id ? updatedCurrent : p));
    discards = newDiscards;
  }

  // Check victory for current player before passing turn (RULES: win at end of turn)
  if (!updatedCurrent.bankrupt && checkWin(updatedCurrent)) {
    return {
      ...room,
      players: nextPlayers,
      discards,
      phase: { name: "finished", winnerId: updatedCurrent.id },
      updatedAt: Date.now(),
    };
  }

  // Find next non-bankrupt seat
  let nextTurn = (room.turn + 1) % room.players.length;
  let safety = room.players.length;
  while (nextPlayers[nextTurn]?.bankrupt && safety > 0) {
    nextTurn = (nextTurn + 1) % room.players.length;
    safety--;
  }

  // Check if only 1 player remains after bankruptcy
  const remaining = nextPlayers.filter((p) => !p.bankrupt);
  if (remaining.length <= 1) {
    return {
      ...room,
      players: nextPlayers,
      discards,
      phase: { name: "finished", winnerId: remaining[0]?.id ?? "" },
      updatedAt: Date.now(),
    };
  }

  return {
    ...room,
    players: nextPlayers,
    turn: nextTurn,
    discards,
    phase: { name: "choose_move" },
    updatedAt: Date.now(),
  };
};

/** Executes auto-turn: moves forward 1 (or smallest legal step) and taxis. */
export const applyAutoTurn = (
  room: Room,
  taxiRoll: number,
): Room => {
  if (room.phase.name === "choose_move") {
    // Try step 1. If full, try step 2, up to 4.
    let movedRoom: Room | null = null;
    for (const step of [1, 2, 3, 4] as const) {
      try {
        movedRoom = applyMove(room, step);
        break;
      } catch {
        continue;
      }
    }
    if (!movedRoom) {
      // Stuck (should not happen with 2 cell cap and 4 cells reach), advance turn directly
      return advanceTurn(room, true);
    }
    room = movedRoom;
  }

  // On resolve_cell, perform taxi with first car if player has one
  const player = seat(room);
  const taxiCar = player.cars.find((c) => c.class !== "retro");
  if (taxiCar) {
    const mult = player.cars[0]?.taxiMult ?? 0n;
    if (mult > 0n) {
      const earned = mult * BigInt(taxiRoll);
      const updated = { ...player, cash: player.cash + earned };
      room = {
        ...room,
        players: room.players.map((p) => (p.id === player.id ? updated : p)),
      };
    }
  }

  return advanceTurn(room, true);
};

export const garageFull = (player: Player): boolean => player.cars.length >= GARAGE_CAP;

export const hasOverdueDebt = (player: Player): boolean => player.loans.some((l) => l.overdue);

/** Gate for the intents the socket layer is allowed to forward. */
export const assertIntent = (room: Room, playerId: string, intent: Intent): void => {
  if (room.phase.name === "auction") {
    if (intent.type !== "bid" && intent.type !== "pass") {
      throw new RuleError("only bid or pass allowed during auction");
    }
    if (room.phase.state.currentTurnPlayerId !== playerId) {
      throw new RuleError("not your auction turn");
    }
    return;
  }

  if (room.phase.name === "race") {
    if (room.phase.state.status === "invitation") {
      if (intent.type !== "race_accept" && intent.type !== "race_forfeit") {
        throw new RuleError("only race_accept or race_forfeit allowed during invitation");
      }
      if (room.phase.state.targetId !== playerId) {
        throw new RuleError("only race target can respond");
      }
      return;
    }
    if (room.phase.state.status === "pool_entry") {
      if (intent.type !== "race_join_pool" && intent.type !== "pass") {
        throw new RuleError("only race_join_pool or pass allowed during pool entry");
      }
      return;
    }
  }

  // General turns
  if (seat(room).id !== playerId) throw new RuleError("not your turn");
  if (intent.type === "move" && room.phase.name !== "choose_move") {
    throw new RuleError("move only in choose_move");
  }
};



