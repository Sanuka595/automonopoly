import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Server } from "socket.io";
import { euro } from "./money.ts";
import { cleanupOldRooms, loadRooms, openDb, saveRoom } from "./snapshot.ts";
import { RoomManager } from "./room.ts";
import type { Player, Room } from "./types.ts";

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
  updatedAt: 1,
  ...over,
});

test("a room round-trips through sqlite with bigint cash intact", () => {
  const db = openDb(":memory:");
  saveRoom(db, room());
  const [loaded] = loadRooms(db);
  assert.equal(loaded?.players[0]?.cash, euro(1_600));
  assert.equal(typeof loaded?.players[0]?.cash, "bigint");
});

test("a file-backed database runs in WAL mode with a busy timeout", () => {
  const dir = mkdtempSync(join(tmpdir(), "tachka-test-"));
  try {
    const db = openDb(join(dir, "tachka.sqlite"));
    assert.equal(db.prepare("PRAGMA journal_mode").get()?.journal_mode, "wal");
    assert.equal(Number(db.prepare("PRAGMA busy_timeout").get()?.timeout), 5000);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cleanupOldRooms drops rooms older than the TTL and keeps fresh ones", () => {
  const db = openDb(":memory:");
  const hour = 60 * 60 * 1000;
  saveRoom(db, room({ id: "old", updatedAt: Date.now() - 25 * hour }));
  saveRoom(db, room({ id: "fresh", updatedAt: Date.now() }));
  assert.equal(cleanupOldRooms(db, 24 * hour), 1);
  const ids = loadRooms(db).map((r) => r.id);
  assert.deepEqual(ids, ["fresh"]);
});

test("rooms survive a restart: save, close, reopen in a fresh RoomManager", () => {
  const dir = mkdtempSync(join(tmpdir(), "tachka-test-"));
  const dbPath = join(dir, "tachka.sqlite");
  const roomId = "restart-room";
  const saved = room({
    id: roomId,
    timerExpiresAt: Date.now() + 60_000, // live turn: restore must schedule, not auto-turn
  });

  const firstDb = openDb(dbPath);
  saveRoom(firstDb, saved);
  firstDb.close();

  try {
    const secondDb = openDb(dbPath);
    const io = new Server();
    const manager = new RoomManager(io, secondDb, "test-token");
    manager.loadPersistedRooms();

    const restored = manager.getRoom(roomId);
    assert(restored);
    assert.equal(restored.id, roomId);
    assert.equal(restored.players[0]?.cash, euro(1_600));
    assert.equal(typeof restored.players[0]?.cash, "bigint");
    assert.equal(restored.phase.name, "choose_move");

    manager.close();
    secondDb.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a restored room with an expired timer fires the auto-turn immediately", () => {
  const dir = mkdtempSync(join(tmpdir(), "tachka-test-"));
  const dbPath = join(dir, "tachka.sqlite");
  const roomId = "stale-room";
  const saved = room({
    id: roomId,
    timerExpiresAt: Date.now() - 1000, // long past: restore must auto-turn, not reschedule
  });

  const firstDb = openDb(dbPath);
  saveRoom(firstDb, saved);
  firstDb.close();

  try {
    const secondDb = openDb(dbPath);
    const io = new Server();
    const manager = new RoomManager(io, secondDb, "test-token");
    manager.loadPersistedRooms();

    const restored = manager.getRoom(roomId);
    assert(restored);
    assert.equal(restored.players[0]?.missedLaps, 1);
    assert.notEqual(restored.timerExpiresAt, undefined);

    manager.close();
    secondDb.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
