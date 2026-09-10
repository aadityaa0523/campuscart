// Mirrors the JSON shapes returned by ../../backend/src routes/*.ts exactly
// — keep these two in sync by hand until a shared package makes that
// automatic (spec §10 "contract tests or shared Zod schemas").

export type Role = "STUDENT" | "ADMIN";
export type GroupStatus = "OPEN" | "THRESHOLD_MET" | "AWAITING_PAYMENTS" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "DISPUTED";
export type ContributionStatus = "PENDING" | "CLAIMED_PAID" | "PAID" | "REFUNDED";

export interface User {
  id: string;
  email: string;
  name: string;
  hostelId: string;
  role: Role;
  reliabilityScore: number;
  upiVpa: string | null;
}

export interface Hostel {
  id: string;
  name: string;
}

export interface GroupItem {
  id: string;
  groupOrderId: string;
  userId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  createdAt: string;
}

export interface Contribution {
  id: string;
  groupOrderId: string;
  userId: string;
  amountPaise: number;
  status: ContributionStatus;
  paidAt: string | null;
}

export interface GroupDetail {
  id: string;
  hostelId: string;
  store: string;
  status: GroupStatus;
  thresholdPaise: number;
  deliveryFeePaise: number;
  coordinatorUserId: string | null;
  expiresAt: string;
  completedAt: string | null;
  actualTotalPaise: number | null;
  items: GroupItem[];
  contributions: Contribution[];
  totalPaise: number;
  remainingPaise: number;
}

export interface MatchResult {
  groupId: string;
  locationProximity: number;
  deliveryTimeSimilarity: number;
  storeCompatibility: number;
  existingCartValue: number;
  groupReliability: number;
  totalScore: number;
  group: GroupDetail;
}

export interface HeatmapEntry {
  hostelId: string;
  hostelName: string;
  pendingPaise: number;
  ready: boolean;
  activeGroups: number;
}

export interface ContributionWithUpi extends Contribution {
  upiLink: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
