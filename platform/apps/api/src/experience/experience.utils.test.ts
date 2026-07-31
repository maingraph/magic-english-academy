import assert from "node:assert/strict";
import test from "node:test";
import { State } from "ts-fsrs";
import { bookingStatus, campaignDeliveryKey, certificateEligible, confidenceForState, outboxRetry, pollPercentages, scheduleReview } from "./experience.utils";

test("FSRS persists complete scheduling state after answer", () => {
  const now = new Date("2026-07-31T10:00:00.000Z");
  const card = scheduleReview(null, 3, now);
  assert.ok(card.due > now);
  assert.ok(card.stability > 0);
  assert.ok(card.difficulty > 0);
  assert.equal(card.reps, 1);
  assert.equal(confidenceForState(card.state), "LEARNING");
});

test("club capacity moves overflow booking to waitlist", () => {
  assert.equal(bookingStatus(15, 16), "BOOKED");
  assert.equal(bookingStatus(16, 16), "WAITLISTED");
});

test("certificate requires every lesson and every checkpoint", () => {
  assert.equal(certificateEligible(12, 12, 12, 12), true);
  assert.equal(certificateEligible(12, 11, 12, 12), false);
  assert.equal(certificateEligible(12, 12, 12, 11), false);
});

test("poll percentages and campaign idempotency are deterministic", () => {
  assert.deepEqual(pollPercentages([{ optionId: "a" }, { optionId: "a" }, { optionId: "b" }], ["a", "b"]), [
    { optionId: "a", votes: 2, percent: 67 },
    { optionId: "b", votes: 1, percent: 33 }
  ]);
  assert.equal(campaignDeliveryKey("campaign", "student"), "campaign:campaign:user:student");
});

test("outbox stops at configured attempt limit", () => {
  assert.equal(outboxRetry(2, 5), "PENDING");
  assert.equal(outboxRetry(4, 5), "FAILED");
  assert.equal(confidenceForState(State.Review), "REVIEW");
});
