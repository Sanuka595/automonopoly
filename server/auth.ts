import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedUser = { id: string; name: string };

/**
 * Telegram Mini App initData.
 * secret = HMAC_SHA256(key="WebAppData", msg=botToken)
 * digest = HMAC_SHA256(key=secret, msg=sorted pairs joined by \n)
 * A user id from the request body is never trusted.
 */
export const verifyInitData = (
  initData: string,
  botToken: string,
  now = Date.now(),
  maxAgeSec = 3600,
): VerifiedUser => {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("initData: no hash");
  params.delete("hash");
  params.delete("signature");

  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const digest = createHmac("sha256", secret).update(dataCheck).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("initData: bad hash");

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSec) {
    throw new Error("initData: expired");
  }
  const user = JSON.parse(params.get("user") ?? "{}") as { id?: number; first_name?: string };
  if (typeof user.id !== "number") throw new Error("initData: no user");
  return { id: String(user.id), name: user.first_name ?? "" };
};
