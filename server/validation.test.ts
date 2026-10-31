import assert from "node:assert/strict";
import test from "node:test";
import { euro } from "./money.ts";
import type { Player, Room } from "./types.ts";
import { RuleError } from "./turn.ts";
import { grantLoan } from "./loans.ts";
import { inviteRace } from "./race.ts";
import { normalizeIntent, parseEuro } from "./validation.ts";

const BID_STEPS = [euro(100), euro(500)];

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
  players: [player(), player({ id: "b", name: "B" })],
  turn: 0,
  phase: { name: "choose_move" },
  decks: { bucket: [], beaten: [], premium: [], retro: [] },
  discards: { bucket: [], beaten: [], premium: [], retro: [] },
  updatedAt: 0,
  ...over,
});

test("parseEuro accepts bigint, safe numbers and decimal strings", () => {
  assert.equal(parseEuro(100n), 100n);
  assert.equal(parseEuro(100), 100n);
  assert.equal(parseEuro("100"), 100n);
  assert.equal(parseEuro(" 100 "), 100n);
  assert.equal(parseEuro("0"), 0n);
});

test("parseEuro rejects negatives, fractions and garbage", () => {
  assert.equal(parseEuro(-50), null);
  assert.equal(parseEuro(-50n), null);
  assert.equal(parseEuro("-50"), null);
  assert.equal(parseEuro("abc"), null);
  assert.equal(parseEuro("1.5"), null);
  assert.equal(parseEuro(""), null);
  assert.equal(parseEuro(null), null);
  assert.equal(parseEuro({}), null);
});

test("a bid with a string step from the client normalizes to bigint", () => {
  const intent = normalizeIntent({ type: "bid", step: "100" });
  assert.deepEqual(intent, { type: "bid", step: 100n });
  if (intent.type !== "bid") throw new Error("unreachable");
  // The auction rule compares against [100n, 500n]: the raw string "100" would never match.
  assert.equal(BID_STEPS.includes(intent.step), true);
});

test("a loan offer with string amounts normalizes and grants with bigint math", () => {
  const intent = normalizeIntent({
    type: "loan_offer",
    targetId: "b",
    principal: "1000",
    due: "1200",
    turns: 2,
  });
  assert.deepEqual(intent, {
    type: "loan_offer",
    targetId: "b",
    principal: 1000n,
    due: 1200n,
    turns: 2,
  });
  if (intent.type !== "loan_offer") throw new Error("unreachable");
  assert.equal(intent.due >= intent.principal, true);

  const next = grantLoan(room(), "a", "b", intent.principal, intent.due, intent.turns);
  const lender = next.players.find((p) => p.id === "a");
  const borrower = next.players.find((p) => p.id === "b");
  assert.equal(lender?.cash, euro(600));
  assert.equal(typeof borrower?.cash, "bigint");
  assert.equal(borrower?.cash, 2600n);
});

test("a race invite with a string stake normalizes and passes bigint to the rule", () => {
  const intent = normalizeIntent({ type: "race_invite", targetId: "b", stake: "500" });
  assert.deepEqual(intent, { type: "race_invite", targetId: "b", stake: 500n });
  if (intent.type !== "race_invite") throw new Error("unreachable");

  const racing = room({
    players: [player(), player({ id: "b", cars: [{} as never] })],
    phase: { name: "resolve_cell", cell: "race" },
  });
  const next = inviteRace(racing, "a", intent.targetId, intent.stake);
  if (next.phase.name !== "race") throw new Error("expected race phase");
  assert.equal(next.phase.state.stake, 500n);
});

test("move steps are strictly 1..4", () => {
  assert.deepEqual(normalizeIntent({ type: "move", steps: 2 }), { type: "move", steps: 2 });
  for (const bad of [0, 5, "2", 1.5, null]) {
    assert.throws(() => normalizeIntent({ type: "move", steps: bad }), RuleError);
  }
});

test("loan turns must be an integer >= 1", () => {
  assert.throws(
    () => normalizeIntent({ type: "loan_offer", targetId: "b", principal: "1000", due: "1200", turns: 0 }),
    /invalid loan turns/,
  );
  assert.throws(
    () => normalizeIntent({ type: "loan_offer", targetId: "b", principal: "1000", due: "1200", turns: 1.5 }),
    RuleError,
  );
  assert.throws(
    () => normalizeIntent({ type: "loan_offer", targetId: "b", principal: "1000", due: "1200", turns: "2" }),
    RuleError,
  );
});

test("bad euro fields are rejected with contract errors", () => {
  for (const step of [-50, "abc", "1.5", Number.NaN, "", null, true]) {
    assert.throws(() => normalizeIntent({ type: "bid", step }), RuleError);
  }
  assert.throws(() => normalizeIntent({ type: "bid", step: "abc" }), /invalid bid step/);
  assert.throws(
    () => normalizeIntent({ type: "race_invite", targetId: "b", stake: "-50" }),
    /invalid race stake/,
  );
});

test("ids must be non-empty strings up to 64 chars", () => {
  assert.throws(() => normalizeIntent({ type: "buy", carId: "" }), /invalid carId/);
  assert.throws(() => normalizeIntent({ type: "buy", carId: "x".repeat(65) }), RuleError);
  assert.throws(() => normalizeIntent({ type: "race_invite", targetId: 42, stake: "100" }), RuleError);
  assert.throws(() => normalizeIntent({ type: "loan_accept" }), /invalid loanId/);
  assert.deepEqual(normalizeIntent({ type: "buy", carId: "car_1" }), { type: "buy", carId: "car_1" });
});

test("unknown and malformed payloads are rejected", () => {
  assert.throws(() => normalizeIntent({ type: "steal_money" }), /unsupported intent/);
  assert.throws(() => normalizeIntent({}), /unsupported intent/);
  assert.throws(() => normalizeIntent(null), /invalid intent/);
  assert.throws(() => normalizeIntent("bid"), /invalid intent/);
  assert.throws(() => normalizeIntent([1, 2]), /invalid intent/);
  // Unknown fields are stripped: the rule layer sees only whitelisted ones.
  assert.deepEqual(normalizeIntent({ type: "bid", step: "100", extra: "stripped" }), {
    type: "bid",
    step: 100n,
  });
});
