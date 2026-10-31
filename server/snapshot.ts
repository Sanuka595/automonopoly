import { DatabaseSync } from "node:sqlite";
import type { Room } from "./types.ts";

const schema = `
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`;

export const openDb = (path: string): DatabaseSync => {
  const db = new DatabaseSync(path);
  // WAL: readers don't block the writer; busy_timeout: wait out lock contention.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(schema);
  return db;
};

// JSON cannot carry bigint. Euro values are stored as decimal strings.
const encode = (room: Room): string =>
  JSON.stringify(room, (_k, v) => (typeof v === "bigint" ? { $euro: v.toString() } : v));

const decode = (raw: string): Room =>
  JSON.parse(raw, (_k, v) =>
    v && typeof v === "object" && "$euro" in v ? BigInt(v.$euro) : v,
  ) as Room;

/** Called only after end_turn, auction_end, race_end. Not on every click. */
export const saveRoom = (db: DatabaseSync, room: Room): void => {
  db.prepare(
    `INSERT INTO rooms (id, state, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
  ).run(room.id, encode(room), room.updatedAt);
};

export const serializeRoom = (room: Room): any =>
  JSON.parse(
    JSON.stringify(room, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

export const loadRooms = (db: DatabaseSync): Room[] =>
  db.prepare("SELECT state FROM rooms").all().map((row) => decode(String(row.state)));

/** TTL sweep: drops rooms untouched for maxAgeMs. Returns the number of rows removed. */
export const cleanupOldRooms = (
  db: DatabaseSync,
  maxAgeMs = 24 * 60 * 60 * 1000,
): number => {
  const cutoff = Date.now() - maxAgeMs;
  const res = db.prepare("DELETE FROM rooms WHERE updated_at < ?").run(cutoff);
  return Number(res.changes);
};


