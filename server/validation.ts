import type { Euro } from "./money.ts";
import { RuleError } from "./turn.ts";
import type { Intent } from "./types.ts";

const INTENT_TYPES: readonly Intent["type"][] = [
  "move",
  "buy",
  "repair",
  "scrap",
  "buyout",
  "rent",
  "race_invite",
  "race_accept",
  "race_forfeit",
  "race_join_pool",
  "bid",
  "pass",
  "taxi",
  "loan_offer",
  "loan_accept",
  "loan_reject",
  "start_auction",
];

/** JSON has no bigint: euro fields arrive as number | string. Yields a non-negative Euro or null. */
export const parseEuro = (val: unknown): Euro | null => {
  if (typeof val === "bigint") return val >= 0n ? val : null;
  if (typeof val === "number") {
    if (!Number.isSafeInteger(val) || val < 0) return null;
    return BigInt(val);
  }
  if (typeof val === "string") {
    if (!/^\d+$/.test(val.trim())) return null;
    try {
      const b = BigInt(val.trim());
      return b >= 0n ? b : null;
    } catch {
      return null;
    }
  }
  return null;
};

const parseId = (val: unknown): string | null => {
  if (typeof val !== "string") return null;
  const id = val.trim();
  return id.length > 0 && id.length <= 64 ? id : null;
};

const parseTurns = (val: unknown): number | null =>
  typeof val === "number" && Number.isSafeInteger(val) && val >= 1 ? val : null;

const euroField = (rec: Record<string, unknown>, key: string, error: string): Euro => {
  const parsed = parseEuro(rec[key]);
  if (parsed === null) throw new RuleError(error);
  return parsed;
};

const idField = (rec: Record<string, unknown>, key: string): string => {
  const parsed = parseId(rec[key]);
  if (parsed === null) throw new RuleError(`invalid ${key}`);
  return parsed;
};

/** Gate between the socket and the rules: rebuilds the intent from whitelisted fields, or throws RuleError. */
export const normalizeIntent = (raw: unknown): Intent => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new RuleError("invalid intent");
  }
  const rec = raw as Record<string, unknown>;
  const type = rec.type;
  if (typeof type !== "string" || !(INTENT_TYPES as readonly string[]).includes(type)) {
    throw new RuleError(`unsupported intent: ${String(type)}`);
  }

  const t = type as Intent["type"];
  switch (t) {
    case "move": {
      const steps = rec.steps;
      if (steps !== 1 && steps !== 2 && steps !== 3 && steps !== 4) {
        throw new RuleError("invalid move steps");
      }
      return { type: "move", steps };
    }
    case "buy":
    case "repair":
    case "scrap":
    case "buyout":
    case "taxi":
      return { type: t, carId: idField(rec, "carId") };
    case "rent":
      return { type: "rent" };
    case "race_invite":
      return {
        type: "race_invite",
        targetId: idField(rec, "targetId"),
        stake: euroField(rec, "stake", "invalid race stake"),
      };
    case "race_accept":
    case "race_forfeit":
    case "race_join_pool":
    case "pass":
    case "start_auction":
    case "loan_reject":
      return { type: t };
    case "bid":
      return { type: "bid", step: euroField(rec, "step", "invalid bid step") };
    case "loan_offer": {
      const principal = euroField(rec, "principal", "invalid loan principal");
      const due = euroField(rec, "due", "invalid loan due");
      const turns = parseTurns(rec.turns);
      if (turns === null) throw new RuleError("invalid loan turns");
      return { type: "loan_offer", targetId: idField(rec, "targetId"), principal, due, turns };
    }
    case "loan_accept":
      return { type: "loan_accept", loanId: idField(rec, "loanId") };
  }
};
