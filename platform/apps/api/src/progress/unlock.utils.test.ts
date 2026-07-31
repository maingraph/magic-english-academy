import assert from "node:assert/strict";
import test from "node:test";
import { canUnlockLevel } from "./unlock.utils";

test("A1-C1 unlock at 80 percent", () => {
  assert.equal(canUnlockLevel("A1", 8, 10), true);
  assert.equal(canUnlockLevel("B2", 7, 10), false);
});

test("A0 requires complete starter route", () => {
  assert.equal(canUnlockLevel("A0", 11, 12), false);
  assert.equal(canUnlockLevel("A0", 12, 12), true);
});
