import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./password";

test("password hash verifies matching password", async () => {
  const hash = await hashPassword("MagicStudent123!");

  assert.equal(await verifyPassword("MagicStudent123!", hash), true);
  assert.equal(await verifyPassword("WrongPassword123!", hash), false);
  assert.notEqual(hash, "MagicStudent123!");
});

test("password hashes use unique salts", async () => {
  const first = await hashPassword("MagicStudent123!");
  const second = await hashPassword("MagicStudent123!");

  assert.notEqual(first, second);
});
