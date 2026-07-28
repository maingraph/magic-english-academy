import assert from "node:assert/strict";
import test from "node:test";
import { canManageFeedPost } from "./feed.service";

test("students cannot publish or manage feed posts", () => {
  assert.equal(canManageFeedPost("student", "student-1", "student-1"), false);
});

test("teachers manage only their own feed posts", () => {
  assert.equal(canManageFeedPost("teacher", "teacher-1", "teacher-1"), true);
  assert.equal(canManageFeedPost("teacher", "teacher-1", "teacher-2"), false);
});

test("admins and owners can moderate every feed post", () => {
  assert.equal(canManageFeedPost("admin", "admin-1", "teacher-1"), true);
  assert.equal(canManageFeedPost("owner", "owner-1", "teacher-1"), true);
});
