import assert from "node:assert/strict";
import test from "node:test";
import { euro } from "./money.ts";
import type { Player, Room } from "./types.ts";
import { applyMove, assertIntent, RuleError } from "./turn.ts";

const player = (over: Partial<Player> = {}): Player => ({
  id: "a",
  name: "A",
  cash: euro(1_600),
  position: 0,
  cars: [],
  loans: [],
  missedLaps: 0,
  bankrupt: false,
  turnCount: 0,
  ...over,
});

const room = (over: Partial<Room> = {}): Room => ({
  id: "r",
  players: [player(), player({ id: "b", name: "B", position: 3 })],
  turn: 0,
  phase: { name: "choose_move" },
  decks: { bucket: [], beaten: [], premium: [], retro: [] },
  discards: { bucket: [], beaten: [], premium: [], retro: [] },
  updatedAt: 0,
  ...over,
});

test("a 3-step jump costs 300 and lands on the cell", () => {
  const next = applyMove(room(), 3);
  assert.equal(next.players[0]?.cash, euro(1_300));
  assert.equal(next.players[0]?.position, 3);
  assert.deepEqual(next.phase, { name: "resolve_cell", cell: "retro" });
});

test("cannot stop on a cell that already holds 2", () => {
  const full = room({
    players: [player(), player({ id: "b", position: 1 }), player({ id: "c", name: "C", position: 1 })],
  });
  assert.throws(() => applyMove(full, 1), RuleError);
});

test("a move from the wrong seat is rejected", () => {
  assert.throws(() => assertIntent(room(), "b", { type: "move", steps: 1 }), /not your turn/);
});

test("a move adds the walked steps to a rented car", () => {
  const rented = player({
    position: 8,
    cars: [
      {
        id: "c1",
        class: "bucket",
        purchase: euro(400),
        buyout: euro(600),
        defect: { kind: "perfect" },
        status: "in_rent",
        taxiMult: euro(50),
        rentSteps: 0,
      },
    ],
  });
  const next = applyMove(room({ players: [rented, player({ id: "b", position: 3 })] }), 1);
  assert.equal(next.players[0]?.position, 0);
  assert.equal(next.players[0]?.cars[0]?.status, "in_rent");
  assert.equal(next.players[0]?.cars[0]?.rentSteps, 1);
});
