import assert from "node:assert/strict";
import test from "node:test";
import { canPay, euro, sub } from "./money.ts";

test("sub refuses a negative balance", () => {
  assert.throws(() => sub(euro(100), euro(200)), /negative/);
  assert.equal(canPay(euro(100), euro(200)), false);
});

test("euro rejects a fraction", () => {
  assert.throws(() => euro(1.5), /safe integer/);
});
