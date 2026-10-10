import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";
import { createHmac } from "node:crypto";
import { RoomManager } from "./room.ts";
import { openDb } from "./snapshot.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

const makeInitData = (id: number, name: string): string => {
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = JSON.stringify({ id, first_name: name });
  const dataCheck = `auth_date=${authDate}\nuser=${userJson}`;
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(dataCheck).digest("hex");
  return `auth_date=${authDate}&user=${encodeURIComponent(userJson)}&hash=${hash}`;
};

test("room lifecycle: lobby join, start game, state broadcast, auto turn", async (t) => {
  const httpServer = createServer();
  const io = new Server(httpServer);
  const db = openDb(":memory:");
  const manager = new RoomManager(io, db, BOT_TOKEN);

  io.on("connection", (socket) => {
    manager.registerSocket(socket);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://localhost:${port}`;

  const c1 = ClientIO(url);
  const c2 = ClientIO(url);
  const c3 = ClientIO(url);

  t.after(() => {
    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
    manager.close();
    io.close();
    httpServer.close();
  });

  const roomId = "test-room-1";
  const p1Init = makeInitData(101, "Player1");
  const p2Init = makeInitData(102, "Player2");
  const p3Init = makeInitData(103, "Player3");

  // 1. Join lobby
  await new Promise<void>((resolve, reject) => {
    c1.emit("auth", { initData: p1Init, roomId }, (res: any) => {
      if (res?.ok && res.state === "lobby") resolve();
      else reject(new Error("c1 auth failed"));
    });
  });

  await new Promise<void>((resolve, reject) => {
    c2.emit("auth", { initData: p2Init, roomId }, (res: any) => {
      if (res?.ok && res.state === "lobby") resolve();
      else reject(new Error("c2 auth failed"));
    });
  });

  await new Promise<void>((resolve, reject) => {
    c3.emit("auth", { initData: p3Init, roomId }, (res: any) => {
      if (res?.ok && res.state === "lobby") resolve();
      else reject(new Error("c3 auth failed"));
    });
  });

  assert.equal(manager.getLobby(roomId).length, 3);

  // 2. Start game by non-host should fail
  await new Promise<void>((resolve) => {
    c2.emit("lobby:start", (res: any) => {
      assert.equal(res?.ok, false);
      assert.match(res?.error, /only lobby host can start/);
      resolve();
    });
  });

  // 3. Start game by host should succeed and emit room:state
  const statePromise = new Promise<any>((resolve) => {
    c1.on("room:state", (state: any) => resolve(state));
  });

  await new Promise<void>((resolve, reject) => {
    c1.emit("lobby:start", (res: any) => {
      if (res?.ok) resolve();
      else reject(new Error(res?.error));
    });
  });

  const startedState = await statePromise;
  assert.equal(startedState.id, roomId);
  assert.equal(startedState.players.length, 3);
  assert.equal(startedState.phase.name, "choose_move");
  assert.equal(startedState.players[0].cash, "1600");
  assert.equal(startedState.players[0].cars.length, 1);

  // 4. Test auto-turn trigger
  const roomBefore = manager.getRoom(roomId);
  assert(roomBefore);
  const activePlayer = roomBefore.players[roomBefore.turn];

  manager.handleTurnTimeout(roomId);

  const roomAfter = manager.getRoom(roomId);
  assert(roomAfter);
  assert.notEqual(roomAfter.turn, roomBefore.turn);
  const prevPlayer = roomAfter.players.find((p) => p.id === activePlayer?.id);
  assert.equal(prevPlayer?.missedLaps, 1);
});
