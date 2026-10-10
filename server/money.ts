// Whole euros only. Upgrade path: decimal.js if a rule ever needs a fraction.
export type Euro = bigint;

export const euro = (n: number): Euro => {
  if (!Number.isSafeInteger(n)) throw new Error("euro: not a safe integer");
  return BigInt(n);
};

export const STARTING_CASH = euro(1_600);
export const BUCKET_REPAIR_MIN = euro(200);
export const BUCKET_REPAIR_MAX = euro(600);
export const WIN_CASH = euro(32_000);
export const EXTRA_STEP_COST = euro(300);
export const TAXI_MULT = { bucket: euro(50), beaten: euro(100), premium: euro(200) } as const;
export const RENT_PAY = { bucket: euro(500), beaten: euro(500), premium: euro(1_000), retro: euro(0) } as const;
export const RACE_BANK = euro(1_000);
export const RACE_BUYOUT = euro(200);
export const LOAN_LATE_FEE = euro(200);
export const BID_STEPS = [euro(100), euro(500)] as const;

export const add = (a: Euro, b: Euro): Euro => a + b;
export const sub = (a: Euro, b: Euro): Euro => {
  if (a < b) throw new Error("balance would go negative");
  return a - b;
};
export const canPay = (cash: Euro, cost: Euro): boolean => cash >= cost;
