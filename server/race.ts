import { add, canPay, euro, sub, type Euro } from "./money.ts";
import { RuleError } from "./turn.ts";
import type { Player, RaceState, Room } from "./types.ts";

export const BANK_RACE_BONUS = euro(1_000);
export const FORFEIT_PENALTY = euro(200);
export const RACE_POOL_TIMEOUT_SEC = 10;

const playerById = (room: Room, id: string): Player => {
  const p = room.players.find((x) => x.id === id);
  if (!p) throw new RuleError("player not found");
  return p;
};

/** Initiates race invite from current seat to target. Target must have >= 1 car. Stake <= 50% of target cash. */
export const inviteRace = (
  room: Room,
  initiatorId: string,
  targetId: string,
  stake: Euro,
): Room => {
  if (room.phase.name !== "resolve_cell" || room.phase.cell !== "race") {
    throw new RuleError("not on race cell");
  }
  if (initiatorId === targetId) throw new RuleError("cannot race yourself");

  const initiator = playerById(room, initiatorId);
  const target = playerById(room, targetId);

  if (target.cars.length === 0) throw new RuleError("target has no cars");
  if (!canPay(initiator.cash, stake)) throw new RuleError("cannot pay stake");

  const maxStake = target.cash / 2n;
  if (stake > maxStake) throw new RuleError("stake exceeds 50% of target cash");

  const state: RaceState = {
    initiatorId,
    targetId,
    stake,
    pool: stake, // initiator's stake committed
    status: "invitation",
    participants: [initiatorId],
  };

  const updatedInitiator = { ...initiator, cash: sub(initiator.cash, stake) };

  return {
    ...room,
    players: room.players.map((p) => (p.id === initiator.id ? updatedInitiator : p)),
    phase: { name: "race", state },
    updatedAt: Date.now(),
  };
};

/** Target accepts race challenge. Matches stake, bank adds 1000 €, pool entry opens for others. */
export const acceptRace = (room: Room, targetId: string): Room => {
  if (room.phase.name !== "race") throw new RuleError("not in race");
  const state = room.phase.state;
  if (state.status !== "invitation" || state.targetId !== targetId) {
    throw new RuleError("not target of race invite");
  }

  const target = playerById(room, targetId);
  if (!canPay(target.cash, state.stake)) throw new RuleError("cannot pay stake");

  const updatedTarget = { ...target, cash: sub(target.cash, state.stake) };
  const pool = add(add(state.pool, state.stake), BANK_RACE_BONUS);

  return {
    ...room,
    players: room.players.map((p) => (p.id === target.id ? updatedTarget : p)),
    phase: {
      name: "race",
      state: {
        ...state,
        pool,
        status: "pool_entry",
        participants: [...state.participants, targetId],
      },
    },
    updatedAt: Date.now(),
  };
};

/** Target forfeits (откуп): pays 200 € penalty to initiator, cancels race, refunds initiator stake. */
export const forfeitRace = (room: Room, targetId: string): Room => {
  if (room.phase.name !== "race") throw new RuleError("not in race");
  const state = room.phase.state;
  if (state.status !== "invitation" || state.targetId !== targetId) {
    throw new RuleError("not target of race invite");
  }

  const target = playerById(room, targetId);
  const initiator = playerById(room, state.initiatorId);

  const penalty = target.cash < FORFEIT_PENALTY ? target.cash : FORFEIT_PENALTY;
  const updatedTarget = { ...target, cash: sub(target.cash, penalty) };
  // Initiator gets their stake back plus the forfeit penalty
  const updatedInitiator = { ...initiator, cash: add(add(initiator.cash, state.stake), penalty) };

  return {
    ...room,
    players: room.players.map((p) =>
      p.id === target.id ? updatedTarget : p.id === initiator.id ? updatedInitiator : p,
    ),
    phase: { name: "end_turn" },
    updatedAt: Date.now(),
  };
};

/** Other players enter the pool within the 10-second window. */
export const joinRacePool = (room: Room, playerId: string): Room => {
  if (room.phase.name !== "race") throw new RuleError("not in race");
  const state = room.phase.state;
  if (state.status !== "pool_entry") throw new RuleError("pool entry closed");
  if (state.participants.includes(playerId)) throw new RuleError("already in pool");

  const player = playerById(room, playerId);
  if (!canPay(player.cash, state.stake)) throw new RuleError("cannot pay stake");

  const updatedPlayer = { ...player, cash: sub(player.cash, state.stake) };

  return {
    ...room,
    players: room.players.map((p) => (p.id === player.id ? updatedPlayer : p)),
    phase: {
      name: "race",
      state: {
        ...state,
        pool: add(state.pool, state.stake),
        participants: [...state.participants, playerId],
      },
    },
    updatedAt: Date.now(),
  };
};

export type StepRaceResult = {
  room: Room;
  rolls: Record<string, number>;
  isTie: boolean;
  tieContenders?: string[];
  winnerId?: string;
};

/**
 * Executes one roll round of the race.
 * Rolls d6 for each active contender (all participants or tied leaders).
 * If a single leader emerges, awards the pool and finishes.
 * If tied leaders emerge, sets tieContenders for a tie-break reroll.
 */
export const stepRaceRoll = (
  room: Room,
  rollFn: () => number,
): StepRaceResult => {
  if (room.phase.name !== "race") throw new RuleError("not in race");
  const state = room.phase.state;
  const contenders =
    state.tieContenders && state.tieContenders.length > 1
      ? state.tieContenders
      : state.participants;

  const roundRolls: Record<string, number> = {};
  for (const id of contenders) {
    roundRolls[id] = rollFn();
  }

  const maxRoll = Math.max(...Object.values(roundRolls));
  const highest = contenders.filter((id) => roundRolls[id] === maxRoll);

  if (highest.length === 1) {
    const winnerId = highest[0]!;
    const winner = playerById(room, winnerId);
    const updatedWinner = { ...winner, cash: add(winner.cash, state.pool) };
    const nextRoom: Room = {
      ...room,
      players: room.players.map((p) => (p.id === winner.id ? updatedWinner : p)),
      phase: {
        name: "race",
        state: {
          ...state,
          status: "rolling",
          rolls: roundRolls,
          tieContenders: undefined,
          winnerId,
        },
      },
      updatedAt: Date.now(),
    };
    return { room: nextRoom, rolls: roundRolls, isTie: false, winnerId };
  }

  // Tie: tie-break reroll required between tied leaders
  const tieContenders = highest;
  const nextRoom: Room = {
    ...room,
    phase: {
      name: "race",
      state: {
        ...state,
        status: "rolling",
        rolls: roundRolls,
        tieContenders,
        winnerId: undefined,
      },
    },
    updatedAt: Date.now(),
  };
  return { room: nextRoom, rolls: roundRolls, isTie: true, tieContenders };
};

/** Resolves race rolls synchronously until a single winner is determined. */
export const resolveRace = (
  room: Room,
  rollFn: () => number,
): { room: Room; winnerId: string; rolls: Record<string, number> } => {
  let currentRoom = room;
  let lastRolls: Record<string, number> = {};
  while (true) {
    const res = stepRaceRoll(currentRoom, rollFn);
    currentRoom = res.room;
    lastRolls = res.rolls;
    if (!res.isTie && res.winnerId) {
      return { room: currentRoom, winnerId: res.winnerId, rolls: lastRolls };
    }
  }
};
