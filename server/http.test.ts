import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { corsAllowsOrigin, createHttpHandler, parseAllowedOrigins, type HttpPerimeter } from "./http.ts";

const perimeter = (over: Partial<HttpPerimeter> = {}): HttpPerimeter => ({
  port: 0,
  botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  isProd: false,
  allowDevToken: false,
  allowedOrigins: [],
  ...over,
});

const serve = async (p: HttpPerimeter, clientDist: string, publicDir: string) => {
  const httpServer = createServer(createHttpHandler(p, clientDist, publicDir));
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => httpServer.close(() => resolve())),
  };
};

const withDist = (fn: (dir: string) => Promise<void>) => {
  const dir = mkdtempSync(join(tmpdir(), "tachka-http-"));
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<html>spa</html>");
  writeFileSync(join(dir, "dist", "app.js"), "console.log(1)");
  writeFileSync(join(dir, "secret.txt"), "leaked");
  return async (t: test.TestContext) => {
    try {
      await fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
};

test("dev playground keeps /dev/token open", async (t) => {
  await withDist(async (dir) => {
    const s = await serve(perimeter(), join(dir, "dist"), join(dir, "public"));
    t.after(() => s.close());

    const res = await fetch(`${s.url}/dev/token?id=7&name=Katya`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { initData: string };
    assert.match(body.initData, /user=/);
    assert.match(body.initData, /hash=/);
  })(t);
});

test("/health returns 200 JSON", async (t) => {
  await withDist(async (dir) => {
    const s = await serve(perimeter(), join(dir, "dist"), join(dir, "public"));
    t.after(() => s.close());

    const res = await fetch(`${s.url}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  })(t);
});

test("production hides /dev/token behind 404 unless DEV_TOKEN=1", async (t) => {
  await withDist(async (dir) => {
    const prod = perimeter({ isProd: true });
    const hidden = await serve(prod, join(dir, "dist"), join(dir, "public"));
    const hiddenRes = await fetch(`${hidden.url}/dev/token`);
    assert.equal(hiddenRes.status, 404);
    await hidden.close();

    const allowed = await serve(perimeter({ isProd: true, allowDevToken: true }), join(dir, "dist"), join(dir, "public"));
    t.after(() => allowed.close());
    const allowedRes = await fetch(`${allowed.url}/dev/token`);
    assert.equal(allowedRes.status, 200);
    const body = (await allowedRes.json()) as { initData: string };
    assert.match(body.initData, /hash=/);
  })(t);
});

test("a missing asset with a file extension is a 404, not index.html", async (t) => {
  await withDist(async (dir) => {
    const s = await serve(perimeter(), join(dir, "dist"), join(dir, "public"));
    t.after(() => s.close());

    const missing = await fetch(`${s.url}/bundle.bad123.js`);
    assert.equal(missing.status, 404);
    assert.doesNotMatch(await missing.text(), /spa/);

    const traversal = await fetch(`${s.url}/..%2Fsecret.txt`);
    assert.equal(traversal.status, 404);

    const deep = await fetch(`${s.url}/some/route`);
    assert.equal(deep.status, 200);
    assert.match(await deep.text(), /spa/);

    const asset = await fetch(`${s.url}/app.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type") ?? "", /javascript/);
  })(t);
});

test("CORS: ALLOWED_ORIGINS whitelist decides, dev allows localhost", async (t) => {
  await withDist(async (dir) => {
    const s = await serve(
      perimeter({ allowedOrigins: ["https://bot.example"] }),
      join(dir, "dist"),
      join(dir, "public"),
    );
    t.after(() => s.close());

    const allowed = await fetch(`${s.url}/health`, { headers: { Origin: "https://bot.example" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://bot.example");

    const foreign = await fetch(`${s.url}/health`, { headers: { Origin: "https://evil.example" } });
    assert.equal(foreign.headers.get("access-control-allow-origin"), null);
    assert.equal(foreign.status, 200); // same-origin tools like curl are not the CORS threat model

    const preflight = await fetch(`${s.url}/health`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(preflight.status, 403);
  })(t);

  // Dev mode (no NODE_ENV=production): localhost of the vite playground is welcome.
  assert.equal(corsAllowsOrigin(perimeter(), "http://localhost:5173"), true);
  assert.equal(corsAllowsOrigin(perimeter(), "http://127.0.0.1:4173"), true);
  assert.equal(corsAllowsOrigin(perimeter({ isProd: true }), "http://localhost:5173"), false);
  assert.equal(corsAllowsOrigin(perimeter({ isProd: true }), "https://bot.example"), false);
  assert.equal(corsAllowsOrigin(perimeter({ isProd: true, allowedOrigins: ["https://bot.example"] }), "https://bot.example"), true);
  assert.equal(corsAllowsOrigin(perimeter(), undefined), true);

  assert.deepEqual(parseAllowedOrigins("https://a.example, https://b.example,"), ["https://a.example", "https://b.example"]);
  assert.deepEqual(parseAllowedOrigins(undefined), []);
});
