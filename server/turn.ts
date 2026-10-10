import { canPay, EXTRA_STEP_COST, sub } from "./money.ts";
import { cellAt, CELL_CAP, stepCost, stepsWalked, TRACK_LEN } from "./track.ts";
import { GARAGE_CAP, type Intent, type Player, type Room } from "./types.ts";

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

export const garageFull = (player: Player): boolean => player.cars.length >= GARAGE_CAP;

export const hasOverdueDebt = (player: Player): boolean => player.loans.some((l) => l.overdue);

/** Gate for the intents the socket layer is allowed to forward. */
export const assertIntent = (room: Room, playerId: string, intent: Intent): void => {
  if (seat(room).id !== playerId) throw new RuleError("not your turn");
  if (intent.type === "move" && room.phase.name !== "choose_move") {
    throw new RuleError("move only in choose_move");
  }
};
