export const CELLS = [
  "buckets",
  "beaten",
  "premium",
  "retro",
  "picker",
  "service",
  "buyout",
  "rent",
  "race",
] as const;

export type Cell = (typeof CELLS)[number];
export const TRACK_LEN = CELLS.length;
export const MAX_STEP = 4;
export const FREE_STEPS = 2;
export const CELL_CAP = 2;

export const cellAt = (index: number): Cell => {
  const cell = CELLS[((index % TRACK_LEN) + TRACK_LEN) % TRACK_LEN];
  if (cell === undefined) throw new Error("track index");
  return cell;
};

export const stepCost = (steps: number): number => {
  if (!Number.isInteger(steps) || steps < 1 || steps > MAX_STEP) {
    throw new Error("steps out of range");
  }
  return Math.max(0, steps - FREE_STEPS) * 300;
};

/** Steps a piece actually walked, including a wrap. Not `to - from`. */
export const stepsWalked = (from: number, to: number): number => (to - from + TRACK_LEN) % TRACK_LEN;
