import { describe, it, expect } from "vitest";
import { computeReliabilityScore, averageReliability, RELIABILITY_DELTAS } from "../../src/lib/reliability.js";

describe("computeReliabilityScore", () => {
  it("starts new students at 100", () => {
    expect(computeReliabilityScore([])).toBe(100);
  });

  it("applies deltas from event history", () => {
    const score = computeReliabilityScore([
      { delta: RELIABILITY_DELTAS.PAYMENT_CONFIRMED },
      { delta: RELIABILITY_DELTAS.PAYMENT_MISSED },
    ]);
    expect(score).toBe(100 + 2 - 15);
  });

  it("floors at 0, never goes negative", () => {
    const events = Array.from({ length: 20 }, () => ({ delta: RELIABILITY_DELTAS.COORDINATOR_FAILED }));
    expect(computeReliabilityScore(events)).toBe(0);
  });

  it("ceilings at 100", () => {
    const events = Array.from({ length: 20 }, () => ({ delta: RELIABILITY_DELTAS.COORDINATOR_COMPLETED }));
    expect(computeReliabilityScore(events)).toBe(100);
  });
});

describe("averageReliability", () => {
  it("defaults to 100 for an empty group", () => {
    expect(averageReliability([])).toBe(100);
  });

  it("averages member scores", () => {
    expect(averageReliability([50, 100])).toBe(75);
  });
});
