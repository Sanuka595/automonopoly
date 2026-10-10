import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { Server } from "socket.io";
import { openDb } from "./snapshot.ts";
import { RoomManager } from "./room.ts";

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SQLITE_PATH = process.env.SQLITE_PATH || "./tachka.sqlite";

if (!BOT_TOKEN) {
  console.warn("WARNING: BOT_TOKEN is empty. InitData verification will fail.");
}

const makeDevInitData = (id: number, name: string): string => {
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = JSON.stringify({ id, first_name: name });
  const dataCheck = `auth_date=${authDate}\nuser=${userJson}`;
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(dataCheck).digest("hex");
  return `auth_date=${authDate}&user=${encodeURIComponent(userJson)}&hash=${hash}`;
};

const httpServer = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  if (url.pathname === "/dev/token") {
    const id = Number(url.searchParams.get("id") || "1");
    const name = url.searchParams.get("name") || `Player ${id}`;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ initData: makeDevInitData(id, name) }));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const htmlPath = join(process.cwd(), "public", "index.html");
    if (existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(htmlPath));
      return;
    }
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
