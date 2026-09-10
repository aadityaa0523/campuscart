/**
 * Rule-based demand matcher (concept doc §"Smart Matching Engine"):
 *   Match Score = location proximity + delivery-time similarity
 *               + store compatibility + existing cart value + group reliability
 * Each term is normalized to [0, 1], so the total score is on a [0, 5] scale.
 * ML-based matching is explicitly out of scope until there's usage data
 * (spec §13) — this rule-based version is the whole matcher.
 */

export interface MatchCandidateGroup {
  id: string;
  hostelId: string;
  store: string;
  createdAt: Date;
  currentTotalPaise: number;
  thresholdPaise: number;
  memberReliabilityScores: number[];
}

export interface MatchRequest {
  hostelId: string;
  store: string;
  now?: Date;
}

export interface MatchScoreBreakdown {
  groupId: string;
  locationProximity: number;
  deliveryTimeSimilarity: number;
  storeCompatibility: number;
  existingCartValue: number;
  groupReliability: number;
  totalScore: number;
}

/** Groups older than this are considered "cold" — freshness score bottoms out at 0. */
const FRESHNESS_WINDOW_MINUTES = 30;

function scoreCandidate(candidate: MatchCandidateGroup, request: MatchRequest): MatchScoreBreakdown {
  const now = request.now ?? new Date();
  const ageMinutes = (now.getTime() - candidate.createdAt.getTime()) / 60_000;

  const locationProximity = candidate.hostelId === request.hostelId ? 1 : 0;
  const storeCompatibility = candidate.store === request.store ? 1 : 0;
  const deliveryTimeSimilarity = Math.max(0, 1 - ageMinutes / FRESHNESS_WINDOW_MINUTES);
  const existingCartValue = Math.min(1, candidate.currentTotalPaise / candidate.thresholdPaise);
  const groupReliability =
    (candidate.memberReliabilityScores.length
      ? candidate.memberReliabilityScores.reduce((a, b) => a + b, 0) / candidate.memberReliabilityScores.length
      : 100) / 100;

  return {
    groupId: candidate.id,
    locationProximity,
    deliveryTimeSimilarity,
    storeCompatibility,
    existingCartValue,
    groupReliability,
    totalScore: locationProximity + deliveryTimeSimilarity + storeCompatibility + existingCartValue + groupReliability,
  };
}

/**
 * Scores every candidate and returns them best-first. Hostel/store mismatches
 * score 0 on those terms rather than being filtered out — callers that only
 * want same-hostel, same-store matches should pre-filter `candidates`, but
 * ranking still degrades gracefully instead of throwing away a candidate.
 */
export function findBestMatch(
  candidates: MatchCandidateGroup[],
  request: MatchRequest,
): MatchScoreBreakdown[] {
  return candidates.map((c) => scoreCandidate(c, request)).sort((a, b) => b.totalScore - a.totalScore);
}
