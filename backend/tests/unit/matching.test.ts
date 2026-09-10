import { describe, it, expect } from "vitest";
import { findBestMatch, type MatchCandidateGroup } from "../../src/lib/matching.js";

const now = new Date("2026-01-01T12:00:00Z");

function group(overrides: Partial<MatchCandidateGroup>): MatchCandidateGroup {
  return {
    id: "g1",
    hostelId: "hostel-a",
    store: "Blinkit",
    createdAt: now,
    currentTotalPaise: 10000,
    thresholdPaise: 20000,
    memberReliabilityScores: [100],
    ...overrides,
  };
}

describe("findBestMatch", () => {
  it("scores a same-hostel, same-store, fresh, near-threshold group highest", () => {
    const [best] = findBestMatch(
      [
        group({ id: "close", currentTotalPaise: 18000 }),
        group({ id: "far", hostelId: "hostel-b" }),
      ],
      { hostelId: "hostel-a", store: "Blinkit", now },
    );
    expect(best.groupId).toBe("close");
    expect(best.locationProximity).toBe(1);
    expect(best.storeCompatibility).toBe(1);
  });

  it("scores 0 location proximity for a different hostel", () => {
    const [result] = findBestMatch([group({ hostelId: "other" })], {
      hostelId: "hostel-a",
      store: "Blinkit",
      now,
    });
    expect(result.locationProximity).toBe(0);
  });

  it("decays freshness score for older groups", () => {
    const fresh = group({ id: "fresh", createdAt: now });
    const stale = group({ id: "stale", createdAt: new Date(now.getTime() - 60 * 60_000) });
    const results = findBestMatch([fresh, stale], { hostelId: "hostel-a", store: "Blinkit", now });
    const freshScore = results.find((r) => r.groupId === "fresh")!;
    const staleScore = results.find((r) => r.groupId === "stale")!;
    expect(staleScore.deliveryTimeSimilarity).toBe(0);
    expect(freshScore.totalScore).toBeGreaterThan(staleScore.totalScore);
  });

  it("weighs group reliability into the total", () => {
    const [result] = findBestMatch(
      [group({ memberReliabilityScores: [40, 60] })],
      { hostelId: "hostel-a", store: "Blinkit", now },
    );
    expect(result.groupReliability).toBe(0.5);
  });

  it("sorts best-first", () => {
    const results = findBestMatch(
      [group({ id: "low", currentTotalPaise: 1000 }), group({ id: "high", currentTotalPaise: 19000 })],
      { hostelId: "hostel-a", store: "Blinkit", now },
    );
    expect(results[0].groupId).toBe("high");
  });
});
