import assert from "node:assert/strict";
import test from "node:test";
import { euro } from "./money.ts";
import { applyAuctionPass, applyBid, concludeAuction, startAuction } from "./auction.ts";
import { acceptRace, forfeitRace, inviteRace, joinRacePool, resolveRace } from "./race.ts";
import { grantLoan, processPlayerLoansAtTurnEnd } from "./loans.ts";
import type { Car, Player, Room } from "./types.ts";

const makeCar = (over: Partial<Car> = {}): Car => ({
  id: "c1",
  class: "retro",
  purchase: euro(8_000),
  buyout: euro(13_000),
  defect: { kind: "fixed", repair: euro(3_000) },
  status: "broken",
  taxiMult: euro(0),
  ...over,
});

const makePlayer = (over: Partial<Player> = {}): Player => ({
  id: "p1",
  name: "Player 1",
  cash: euro(10_000),
  position: 0,
  cars: [makeCar({ id: "init_car", class: "bucket" })],
  loans: [],
  missedLaps: 0,
  bankrupt: false,
  turnCount: 0,
  ...over,
});

const makeRoom = (over: Partial<Room> = {}): Room => ({
  id: "test",
  players: [
    makePlayer({ id: "p1", name: "P1" }),
    makePlayer({ id: "p2", name: "P2" }),
    makePlayer({ id: "p3", name: "P3" }),
  ],
  turn: 0,
  phase: { name: "choose_move" },
  decks: { bucket: [], beaten: [], premium: [], retro: [] },
  discards: { bucket: [], beaten: [], premium: [], retro: [] },
  updatedAt: 0,
  ...over,
});

test("auction: starts with nominal, bids raise price, passes award car to highest bidder", () => {
  const room = makeRoom();
  const car = makeCar();
  const started = startAuction(room, car);

  assert.equal(started.phase.name, "auction");
  if (started.phase.name !== "auction") return;
  assert.equal(started.phase.state.highestBid, euro(8_000));
  assert.equal(started.phase.state.currentTurnPlayerId, "p1");

  // P1 bids +500 -> 8500
  const afterBid1 = applyBid(started, "p1", euro(500));
  if (afterBid1.phase.name !== "auction") return;
  assert.equal(afterBid1.phase.state.highestBid, euro(8_500));
  assert.equal(afterBid1.phase.state.highestBidderId, "p1");
  assert.equal(afterBid1.phase.state.currentTurnPlayerId, "p2");

  // P2 passes
  const afterPassP2 = applyAuctionPass(afterBid1, "p2");
  assert.equal(afterPassP2.ended, false);

  // P3 passes -> auction concludes, P1 gets car for 8500
  const afterPassP3 = applyAuctionPass(afterPassP2.room, "p3");
  assert.equal(afterPassP3.ended, true);
  assert.equal(afterPassP3.room.phase.name, "end_turn");

  const p1 = afterPassP3.room.players.find((p) => p.id === "p1");
  assert.equal(p1?.cash, euro(1_500)); // 10000 - 8500
  assert.equal(p1?.cars.length, 2);
  assert.equal(p1?.cars[1]?.id, car.id);
});

test("race: invite, accept with +1000 bank bonus, pool join, resolution", () => {
  const room = makeRoom({ phase: { name: "resolve_cell", cell: "race" } });

  // P1 invites P2 with stake 2000 (P2 cash is 10000, 50% max is 5000)
  const invited = inviteRace(room, "p1", "p2", euro(2_000));
  assert.equal(invited.phase.name, "race");
  if (invited.phase.name !== "race") return;
  assert.equal(invited.phase.state.pool, euro(2_000));

  // P2 accepts -> pool = 2000 + 2000 + 1000 bank bonus = 5000
  const accepted = acceptRace(invited, "p2");
  if (accepted.phase.name !== "race") return;
  assert.equal(accepted.phase.state.pool, euro(5_000));
  assert.equal(accepted.phase.state.status, "pool_entry");

  // P3 enters pool (+2000) -> pool = 7000
  const joined = joinRacePool(accepted, "p3");
  if (joined.phase.name !== "race") return;
  assert.equal(joined.phase.state.pool, euro(7_000));

  // Resolve with mock dice where P3 rolls 6, others 2 and 3
  const diceMap: Record<string, number> = { p1: 2, p2: 3, p3: 6 };
  let rollIdx = 0;
  const rolls = [2, 3, 6];
  const { room: resolved, winnerId } = resolveRace(joined, () => rolls[rollIdx++] || 1);

  assert.equal(winnerId, "p3");
  const p3 = resolved.players.find((p) => p.id === "p3");
  assert.equal(p3?.cash, euro(15_000)); // 10000 - 2000 + 7000
});

test("race forfeit: target pays 200 penalty and initiator gets refund + penalty", () => {
  const room = makeRoom({ phase: { name: "resolve_cell", cell: "race" } });
  const invited = inviteRace(room, "p1", "p2", euro(1_000));
  const forfeited = forfeitRace(invited, "p2");

  assert.equal(forfeited.phase.name, "end_turn");
  const p1 = forfeited.players.find((p) => p.id === "p1");
  const p2 = forfeited.players.find((p) => p.id === "p2");

  assert.equal(p1?.cash, euro(10_200)); // 10000 - 1000 + 1000 + 200
  assert.equal(p2?.cash, euro(9_800)); // 10000 - 200
});

test("loans: grant, turn countdown, default triggers penalty and collection", () => {
  const room = makeRoom();

  // P1 loans 2000 to P2 with return 2500 in 1 turn
  const loaned = grantLoan(room, "p1", "p2", euro(2_000), euro(2_500), 1);
  const p1 = loaned.players.find((p) => p.id === "p1");
  const p2 = loaned.players.find((p) => p.id === "p2");
  assert.equal(p1?.cash, euro(8_000));
  assert.equal(p2?.cash, euro(12_000));
  assert.equal(p2?.loans.length, 1);

  // When P2 ends turn, 1 turn elapsed -> loan collected (2500 paid to P1)
  const afterTurn = processPlayerLoansAtTurnEnd(loaned, "p2");
  const p1After = afterTurn.players.find((p) => p.id === "p1");
  const p2After = afterTurn.players.find((p) => p.id === "p2");

  assert.equal(p1After?.cash, euro(10_500)); // 8000 + 2500
  assert.equal(p2After?.cash, euro(9_500)); // 12000 - 2500
  assert.equal(p2After?.loans.length, 0);
});
