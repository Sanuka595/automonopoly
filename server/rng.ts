import { randomInt } from "node:crypto";

/** Inclusive 1..6. The only dice in the game; never call Math.random. */
export const d6 = (): number => randomInt(1, 7);

export const shuffle = <T>(items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) throw new Error("shuffle");
    out[i] = b;
    out[j] = a;
  }
  return out;
};
