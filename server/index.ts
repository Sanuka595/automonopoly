import { createServer } from "node:http";
import { Server } from "socket.io";
import { openDb } from "./snapshot.ts";
import { RoomManager } from "./room.ts";

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SQLITE_PATH = process.env.SQLITE_PATH || "./tachka.sqlite";

if (!BOT_TOKEN) {
  console.warn("WARNING: BOT_TOKEN is empty. InitData verification will fail.");
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const db = openDb(SQLITE_PATH);
const manager = new RoomManager(io, db, BOT_TOKEN);

io.on("connection", (socket) => {
  manager.registerSocket(socket);
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
