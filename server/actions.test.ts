import assert from "node:assert/strict";
import test from "node:test";
import { applyBuy, applyBuyout, applyRent, applyRepair, applyTaxi } from "./actions.ts";
import { euro } from "./money.ts";
import type { Cell } from "./track.ts";
import type { Car, Player, Room } from "./types.ts";
import { RuleError } from "./turn.ts";

const car = (over: Partial<Car> = {}): Car => ({
  id: "c1",
  class: "bucket",
  purchase: euro(400),
  buyout: euro(700),
  defect: { kind: "fixed", repair: euro(200) },
  status: "broken",
  taxiMult: euro(50),
  ...over,
});

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

const room = (cell: Cell, over: Partial<Player> = {}): Room => ({
  id: "r",
  players: [player(over)],
  turn: 0,
  phase: { name: "resolve_cell", cell },
  decks: { bucket: [], beaten: [], premium: [], retro: [] },
  discards: { bucket: [], beaten: [], premium: [], retro: [] },
  updatedAt: 0,
});

test("repair charges the card and marks the car ready", () => {
  const next = applyRepair(room("service", { cars: [car()] }), "c1");
  assert.equal(next.players[0]?.cash, euro(1_400));
  assert.equal(next.players[0]?.cars[0]?.status, "ready");
});

test("beaten repair is d6 times the card multiplier", () => {
  const beaten = car({ class: "beaten", defect: { kind: "roll", multiplier: euro(100) } });
  const next = applyRepair(room("service", { cars: [beaten] }), "c1", 4);
  assert.equal(next.players[0]?.cash, euro(1_200));
});

test("a repair the player cannot pay is rejected and changes nothing", () => {
  const broke = room("service", { cash: euro(100), cars: [car()] });
  assert.throws(() => applyRepair(broke, "c1"), RuleError);
  assert.equal(broke.players[0]?.cars[0]?.status, "broken");
});

test("buyout of a raspil pays the purchase price, not the margin", () => {
  const raspil = car({ status: "ready", defect: { kind: "raspil" }, buyout: euro(900) });
  const next = applyBuyout(room("buyout", { cars: [raspil] }), "c1");
  assert.equal(next.players[0]?.cash, euro(2_000));
  assert.equal(next.players[0]?.cars.length, 0);
  assert.equal(next.discards.bucket[0]?.id, "c1");
});

test("a car still cooling down does not pay rent again", () => {
  const cooling = car({ status: "in_rent", rentSteps: 8 });
  assert.throws(() => applyRent(room("rent", { cars: [cooling] })), /nothing to rent/);
});

test("rent pays a cooled car and resets its counter", () => {
  const cooled = car({ status: "in_rent", rentSteps: 9 });
  const next = applyRent(room("rent", { cars: [cooled] }));
  assert.equal(next.players[0]?.cash, euro(2_100));
  assert.equal(next.players[0]?.cars[0]?.rentSteps, 0);
});

test("retro is skipped by rent", () => {
  const retro = car({ class: "retro", status: "ready", taxiMult: euro(0) });
  assert.throws(() => applyRent(room("rent", { cars: [retro] })), RuleError);
});

test("taxi on a broken bucket pays d6 times 50", () => {
  const next = applyTaxi(room("race", { cars: [car()] }), "c1", 6);
  assert.equal(next.players[0]?.cash, euro(1_900));
  assert.equal(next.phase.name, "resolve_cell");
});

test("retro cannot taxi", () => {
  const retro = car({ class: "retro", taxiMult: euro(0) });
  assert.throws(() => applyTaxi(room("race", { cars: [retro] }), "c1", 3), /cannot taxi/);
});

test("an overdue loan blocks a purchase", () => {
  const offer = car({ status: "broken" });
  const debtor = room("buckets", {
    loans: [
      {
        id: "l",
        lenderId: "b",
        borrowerId: "a",
        principal: euro(100),
        due: euro(200),
        turnsLeft: 0,
        overdue: true,
      },
    ],
  });
  debtor.decks.bucket.push(offer);
  assert.throws(() => applyBuy(debtor, "c1"), /overdue/);
});

test("a perfect card is bought already ready", () => {
  const offer = car({ defect: { kind: "perfect" } });
  const shop = room("buckets");
  shop.decks.bucket.push(offer);
  const next = applyBuy(shop, "c1");
  assert.equal(next.players[0]?.cash, euro(1_200));
  assert.equal(next.players[0]?.cars[0]?.status, "ready");
  assert.equal(next.decks.bucket.length, 0);
});
