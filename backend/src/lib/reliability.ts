export type ReliabilityEventType =
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_MISSED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "COORDINATOR_COMPLETED"
  | "COORDINATOR_FAILED";

/** Point delta applied per event. Coordinator events weigh more — that's the
 * higher-trust, higher-stakes role (they hold the group's money briefly). */
export const RELIABILITY_DELTAS: Record<ReliabilityEventType, number> = {
  PAYMENT_CONFIRMED: 2,
  PAYMENT_MISSED: -15,
  ORDER_COMPLETED: 3,
  ORDER_CANCELLED: -10,
  COORDINATOR_COMPLETED: 8,
  COORDINATOR_FAILED: -30,
};

export const DEFAULT_RELIABILITY_SCORE = 100;

/** Score is 0-100, starts at 100 (benefit of the doubt for new students) and
 * decays with bad events, floored/ceilinged so one incident can't zero out
 * a long history and good behavior can't exceed the scale. */
export function computeReliabilityScore(events: { delta: number }[]): number {
  const total = events.reduce((sum, e) => sum + e.delta, DEFAULT_RELIABILITY_SCORE);
  return Math.max(0, Math.min(100, total));
}

export function averageReliability(scores: number[]): number {
  if (scores.length === 0) return DEFAULT_RELIABILITY_SCORE;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
