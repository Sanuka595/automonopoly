import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { createHmac } from "node:crypto";

/** Everything the HTTP layer needs from the environment, resolved once in index.ts. */
export type HttpPerimeter = {
  port: number;
  botToken: string;
  isProd: boolean;
  allowDevToken: boolean;
  allowedOrigins: string[];
};

export const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Cross-origin gate. No Origin header = same-origin or non-browser: always allowed. */
export const corsAllowsOrigin = (p: HttpPerimeter, origin: string | undefined): boolean => {
  if (!origin) return true;
  if (p.allowedOrigins.length > 0) return p.allowedOrigins.includes(origin);
  return !p.isProd && DEV_ORIGIN.test(origin);
};

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "application/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  json: "application/json",
};

export const makeDevInitData = (botToken: string, id: number, name: string): string => {
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = JSON.stringify({ id, first_name: name });
  const dataCheck = `auth_date=${authDate}\nuser=${userJson}`;
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheck).digest("hex");
  return `auth_date=${authDate}&user=${encodeURIComponent(userJson)}&hash=${hash}`;
};

const corsHeaders = (origin: string | undefined, allowed: boolean): Record<string, string> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
};

const hasFileExtension = (path: string): boolean => /\.[a-zA-Z0-9]+$/.test(path);

export const createHttpHandler =
  (p: HttpPerimeter, clientDist: string, publicDir: string) =>
  (req: IncomingMessage, res: ServerResponse): void => {
    const url = new URL(req.url || "/", `http://localhost:${p.port}`);
    const origin = req.headers.origin;
    const originAllowed = corsAllowsOrigin(p, origin);
    const cors = corsHeaders(origin, originAllowed);

    if (req.method === "OPTIONS") {
      if (url.pathname === "/dev/token" || url.pathname === "/health") {
        res.writeHead(originAllowed ? 204 : 403, cors);
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
      return;
    }

    if (url.pathname === "/dev/token") {
      // Signed initData is an auth bypass: in production it must not leak, DEV_TOKEN=1 re-opens it explicitly.
      if (p.isProd && !p.allowDevToken) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
      const id = Number(url.searchParams.get("id") || "1");
      const name = url.searchParams.get("name") || `Player ${id}`;
      res.writeHead(200, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ initData: makeDevInitData(p.botToken, id, name) }));
      return;
    }

    // Static assets + SPA fallback. A missing asset with a file extension is a 404,
    // never index.html (a stale bundle hash must fail loudly).
    const useDist = existsSync(clientDist);
    const root = useDist ? resolve(clientDist) : existsSync(publicDir) ? resolve(publicDir) : null;
    if (!root) {
      res.writeHead(404);
      res.end();
      return;
    }

    let filePath: string | null = null;
    const rel = decodeURIComponent(url.pathname);
    const candidate = resolve(root, rel.replace(/^\/+/, ""));
    const contained = candidate === root || candidate.startsWith(root + sep);
    if (contained && existsSync(candidate) && statSync(candidate).isFile()) {
      filePath = candidate;
    } else if (!hasFileExtension(rel)) {
      filePath = useDist ? join(clientDist, "index.html") : join(publicDir, "index.html");
    }

    if (filePath && existsSync(filePath)) {
      const ext = filePath.split(".").pop() ?? "";
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "text/plain", ...cors });
      res.end(readFileSync(filePath));
      return;
    }

    res.writeHead(404);
    res.end();
  };
