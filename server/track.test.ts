import assert from "node:assert/strict";
import test from "node:test";
import { CELLS, stepCost, stepsWalked } from "./track.ts";

test("one of each cell", () => {
  assert.equal(CELLS.length, 9);
  assert.equal(new Set(CELLS).size, 9);
});

test("steps 1-2 free, 3-4 cost 300 each", () => {
  assert.equal(stepCost(1), 0);
  assert.equal(stepCost(2), 0);
  assert.equal(stepCost(3), 300);
  assert.equal(stepCost(4), 600);
  assert.throws(() => stepCost(5));
});

test("steps walked count a wrap, not the backward gap", () => {
  assert.equal(stepsWalked(8, 0), 1);
  assert.equal(stepsWalked(7, 8), 1);
  assert.equal(stepsWalked(8, 2), 3);
});
