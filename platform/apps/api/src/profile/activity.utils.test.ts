import assert from "node:assert/strict";
import test from "node:test";
import { activityStats, localCalendarDate, startOfIsoWeek } from "./activity.utils";

test("local calendar day follows the user's timezone around midnight", () => {
  const instant = new Date("2026-07-28T22:30:00.000Z");
  assert.equal(
    localCalendarDate(instant, "Europe/Warsaw").toISOString(),
    "2026-07-29T00:00:00.000Z"
  );
  assert.equal(
    localCalendarDate(instant, "America/New_York").toISOString(),
    "2026-07-28T00:00:00.000Z"
  );
});

test("week starts on Monday", () => {
  assert.equal(
    startOfIsoWeek(new Date("2026-07-30T00:00:00.000Z")).toISOString(),
    "2026-07-27T00:00:00.000Z"
  );
});

test("streak keeps the previous week while the current week is still empty", () => {
  const stats = activityStats(
    ["2026-07-13", "2026-07-21"],
    new Date("2026-07-27T00:00:00.000Z")
  );
  assert.deepEqual(stats, { weeklyDays: 0, streakWeeks: 2 });
});

test("streak stops at the first fully inactive week", () => {
  const stats = activityStats(
    ["2026-07-06", "2026-07-21", "2026-07-28"],
    new Date("2026-07-30T00:00:00.000Z")
  );
  assert.deepEqual(stats, { weeklyDays: 1, streakWeeks: 2 });
});
