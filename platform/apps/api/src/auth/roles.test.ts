import assert from "node:assert/strict";
import test from "node:test";
import { hasRole } from "./dev-session";

test("role hierarchy grants only equal or lower access", () => {
  assert.equal(hasRole("student", ["student"]), true);
  assert.equal(hasRole("student", ["admin"]), false);
  assert.equal(hasRole("admin", ["student"]), true);
  assert.equal(hasRole("owner", ["admin"]), true);
});
