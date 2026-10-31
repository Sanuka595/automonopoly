import { createServer } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { Server } from "socket.io";
import { openDb, cleanupOldRooms } from "./snapshot.ts";
import { RoomManager } from "./room.ts";
import { createHttpHandler, corsAllowsOrigin, parseAllowedOrigins } from "./http.ts";

// Load .env if present (native Node.js)
if (process.loadEnvFile) {
  try { process.loadEnvFile(); } catch {}
}

const PORT = Number(process.env.PORT || 3005);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SQLITE_PATH = process.env.SQLITE_PATH || "./tachka.sqlite";

if (!BOT_TOKEN) {
  console.warn("WARNING: BOT_TOKEN is empty. InitData verification will fail.");
}

const perimeter = {
  port: PORT,
  botToken: BOT_TOKEN,
  isProd: process.env.NODE_ENV === "production",
  allowDevToken: process.env.DEV_TOKEN === "1",
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
};

const httpServer = createServer(
  createHttpHandler(
    perimeter,
    join(process.cwd(), "client", "dist"),
    join(process.cwd(), "public"),
  ),
);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => cb(null, corsAllowsOrigin(perimeter, origin)),
    methods: ["GET", "POST"],
  },
  allowRequest: (req, cb) => {
    cb(null, corsAllowsOrigin(perimeter, req.headers.origin));
  },
});

const db = openDb(SQLITE_PATH);
const manager = new RoomManager(io, db, BOT_TOKEN);
manager.loadPersistedRooms();

// TTL sweep of abandoned rooms; unref keeps the interval from holding the process open.
setInterval(() => cleanupOldRooms(db), 3600_000).unref();

io.on("connection", (socket) => {
  manager.registerSocket(socket);
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
