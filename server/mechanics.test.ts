import assert from "node:assert/strict";
import test from "node:test";
import { euro } from "./money.ts";
import { applyAuctionPass, applyBid, concludeAuction, startAuction } from "./auction.ts";
import { acceptRace, forfeitRace, inviteRace, joinRacePool, resolveRace } from "./race.ts";
import { grantLoan, processPlayerLoansAtTurnEnd } from "./loans.ts";
import { applyBuy, applyScrap } from "./actions.ts";
import { stepRaceRoll } from "./race.ts";
import { recycleDeck } from "./decks.ts";
import { advanceTurn } from "./turn.ts";
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

test("picker allows buying from any non-retro deck", () => {
  const beatenCar = makeCar({ id: "beaten_1", class: "beaten", purchase: euro(2_000) });
  const room = makeRoom({
    phase: { name: "resolve_cell", cell: "picker" },
    decks: { bucket: [], beaten: [beatenCar], premium: [], retro: [] },
  });

  const bought = applyBuy(room, "beaten_1");
  const p1 = bought.players.find((p) => p.id === "p1");
  assert.equal(p1?.cash, euro(8_000));
  assert.equal(p1?.cars.length, 2);
  assert.equal(p1?.cars[1]?.id, "beaten_1");
});

test("scrap: broken car scrapped on service or buyout for 50 € frees slot; ready car rejected", () => {
  const brokenCar = makeCar({ id: "broken_1", class: "bucket", status: "broken" });
  const readyCar = makeCar({ id: "ready_1", class: "bucket", status: "ready" });
  const room = makeRoom({
    phase: { name: "resolve_cell", cell: "service" },
    players: [
      {
        id: "p1",
        name: "P1",
        cash: euro(100),
        position: 5,
        cars: [brokenCar, readyCar],
        loans: [],
        missedLaps: 0,
        bankrupt: false,
        turnCount: 0,
      },
      {
        id: "p2",
        name: "P2",
        cash: euro(1000),
        position: 0,
        cars: [],
        loans: [],
        missedLaps: 0,
        bankrupt: false,
        turnCount: 0,
      },
    ],
  });

  // Ready car cannot be scrapped
  assert.throws(() => applyScrap(room, "ready_1"), /only broken cars can be scrapped/);

  // Broken car scrapped on service
  const scrapped = applyScrap(room, "broken_1");
  const p1 = scrapped.players.find((p) => p.id === "p1");
  assert.equal(p1?.cash, euro(150)); // 100 + 50
  assert.equal(p1?.cars.length, 1);
  assert.equal(scrapped.discards.bucket.length, 1);
  assert.equal(scrapped.discards.bucket[0]?.id, "broken_1");
});

test("elimination victory: when remaining non-bankrupt players === 1, sole survivor wins immediately", () => {
  const room = makeRoom({
    turn: 0,
    players: [
      {
        id: "p1",
        name: "P1",
        cash: euro(500),
        position: 0,
        cars: [],
        loans: [],
        missedLaps: 2,
        bankrupt: false,
        turnCount: 0,
      },
      {
        id: "p2",
        name: "P2",
        cash: euro(1_000),
        position: 1,
        cars: [],
        loans: [],
        missedLaps: 0,
        bankrupt: false,
        turnCount: 0,
      },
      {
        id: "p3",
        name: "P3",
        cash: euro(0),
        position: 2,
        cars: [],
        loans: [],
        missedLaps: 3,
        bankrupt: true,
        turnCount: 0,
      },
    ],
  });

  // P1 times out on lap 3 -> becomes bankrupt -> only P2 remains
  const afterTurn = advanceTurn(room, true);
  assert.equal(afterTurn.phase.name, "finished");
  if (afterTurn.phase.name === "finished") {
    assert.equal(afterTurn.phase.winnerId, "p2");
  }
});

test("deck recycling: empty deck reshuffles discard pile into new deck", () => {
  const discardedCar = makeCar({ id: "disc_1", status: "ready" });
  const decks = { bucket: [], beaten: [], premium: [], retro: [] };
  const discards = { bucket: [discardedCar], beaten: [], premium: [], retro: [] };

  const recycled = recycleDeck(decks, discards, "bucket");
  assert.equal(recycled.decks.bucket.length, 1);
  assert.equal(recycled.discards.bucket.length, 0);
  assert.equal(recycled.decks.bucket[0]?.id, "disc_1");
  // Defect status reset to broken (since defect is not perfect)
  assert.equal(recycled.decks.bucket[0]?.status, "broken");
});

test("race tie-break: equal highest roll triggers reroll micro-phase between leaders", () => {
  const room = makeRoom({
    phase: {
      name: "race",
      state: {
        initiatorId: "p1",
        targetId: "p2",
        stake: euro(500),
        pool: euro(2_000),
        status: "pool_entry",
        participants: ["p1", "p2", "p3"],
      },
    },
  });

  // Round 1: p1 rolls 5, p2 rolls 5, p3 rolls 2 -> tie between p1 and p2
  let step1CallCount = 0;
  const s1 = stepRaceRoll(room, () => [5, 5, 2][step1CallCount++] || 1);
  assert.equal(s1.isTie, true);
  assert.deepEqual(s1.tieContenders, ["p1", "p2"]);
  assert.equal(s1.winnerId, undefined);

  // Round 2: reroll between tieContenders (p1 and p2): p1 rolls 3, p2 rolls 6 -> p2 wins
  let step2CallCount = 0;
  const s2 = stepRaceRoll(s1.room, () => [3, 6][step2CallCount++] || 1);
  assert.equal(s2.isTie, false);
  assert.equal(s2.winnerId, "p2");
  const p2 = s2.room.players.find((p) => p.id === "p2");
  assert.equal(p2?.cash, euro(12_000)); // 10000 + 2000
});
