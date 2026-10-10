import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { verifyInitData } from "./auth.ts";

const sign = (pairs: Record<string, string>, token: string): string => {
  const dataCheck = Object.entries(pairs)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheck).digest("hex");
  const q = new URLSearchParams({ ...pairs, hash });
  return q.toString();
};

test("a signed initData yields the user id", () => {
  const now = 1_700_000_000_000;
  const raw = sign(
    { auth_date: "1700000000", user: JSON.stringify({ id: 42, first_name: "Ann" }) },
    "token",
  );
  assert.deepEqual(verifyInitData(raw, "token", now), { id: "42", name: "Ann" });
});

test("a tampered user id is rejected", () => {
  const raw = sign(
    { auth_date: "1700000000", user: JSON.stringify({ id: 42, first_name: "Ann" }) },
    "token",
  );
  const forged = raw.replace("42", "7");
  assert.throws(() => verifyInitData(forged, "token", 1_700_000_000_000), /bad hash/);
});
