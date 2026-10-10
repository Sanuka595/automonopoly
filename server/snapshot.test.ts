import assert from "node:assert/strict";
import test from "node:test";
import { euro } from "./money.ts";
import { loadRooms, openDb, saveRoom } from "./snapshot.ts";
import type { Room } from "./types.ts";

test("a room round-trips through sqlite with bigint cash intact", () => {
  const db = openDb(":memory:");
  const room: Room = {
    id: "r",
    players: [
      {
        id: "a",
        name: "A",
        cash: euro(1_600),
        position: 0,
        cars: [],
        loans: [],
        missedLaps: 0,
        bankrupt: false,
        turnCount: 0,
      },
    ],
    turn: 0,
    phase: { name: "choose_move" },
    decks: { bucket: [], beaten: [], premium: [], retro: [] },
    discards: { bucket: [], beaten: [], premium: [], retro: [] },
    updatedAt: 1,
  };
  saveRoom(db, room);
  const [loaded] = loadRooms(db);
  assert.equal(loaded?.players[0]?.cash, euro(1_600));
  assert.equal(typeof loaded?.players[0]?.cash, "bigint");
});
