import { createEmptyCard, fsrs, State, type Card, type Grade } from "ts-fsrs";

const scheduler = fsrs();

export function scheduleReview(card: Card | null, rating: Grade, now: Date) {
  return scheduler.next(card ?? createEmptyCard(now), now, rating).card;
}

export function bookingStatus(booked: number, capacity: number) {
  return booked < capacity ? "BOOKED" as const : "WAITLISTED" as const;
}

export function certificateEligible(totalLessons: number, completedLessons: number, checkpointTotal: number, correctCheckpoints: number) {
  return totalLessons > 0 && completedLessons === totalLessons && checkpointTotal === correctCheckpoints;
}

export function campaignDeliveryKey(campaignId: string, userId: string) {
  return `campaign:${campaignId}:user:${userId}`;
}

export function outboxRetry(attemptsBeforeClaim: number, maximumAttempts: number) {
  return attemptsBeforeClaim + 1 >= maximumAttempts ? "FAILED" as const : "PENDING" as const;
}

export function pollPercentages(votes: Array<{ optionId: string }>, optionIds: string[]) {
  const total = votes.length;
  return optionIds.map((optionId) => ({
    optionId,
    votes: votes.filter((vote) => vote.optionId === optionId).length,
    percent: total ? Math.round(votes.filter((vote) => vote.optionId === optionId).length / total * 100) : 0
  }));
}

export function confidenceForState(state: State) {
  if (state === State.New) return "NEW";
  if (state === State.Review) return "REVIEW";
  if (state === State.Relearning) return "RELEARNING";
  return "LEARNING";
}
