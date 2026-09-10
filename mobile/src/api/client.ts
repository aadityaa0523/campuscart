import { tokenStore } from "./tokenStore";
import type {
  AuthResponse,
  Contribution,
  ContributionWithUpi,
  GroupDetail,
  Hostel,
  HeatmapEntry,
  MatchResult,
  User,
} from "../types/api";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = await tokenStore.getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "You're offline — check your connection and try again.");
  }

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as AuthResponse;
    await tokenStore.save(body.accessToken, body.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  signup: (body: { email: string; password: string; name: string; hostelId: string }) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: (refreshToken: string) => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: () => request<User>("/users/me"),
  updateUpiVpa: (upiVpa: string) => request<User>("/users/me", { method: "PATCH", body: JSON.stringify({ upiVpa }) }),
  hostels: () => request<Hostel[]>("/hostels"),

  createGroup: (body: { hostelId: string; store?: string; items: { name: string; pricePaise: number; quantity?: number }[] }) =>
    request<GroupDetail>("/groups", { method: "POST", body: JSON.stringify(body) }),
  getGroup: (id: string) => request<GroupDetail>(`/groups/${id}`),
  joinGroup: (groupId: string, items: { name: string; pricePaise: number; quantity?: number }[]) =>
    request<GroupDetail>(`/groups/${groupId}/join`, { method: "POST", body: JSON.stringify({ items }) }),
  addItems: (groupId: string, items: { name: string; pricePaise: number; quantity?: number }[]) =>
    request<GroupDetail>(`/groups/${groupId}/items`, { method: "POST", body: JSON.stringify({ items }) }),
  findMatches: (params: { hostelId: string; store?: string }) =>
    request<MatchResult[]>(`/groups/matches?hostelId=${encodeURIComponent(params.hostelId)}&store=${encodeURIComponent(params.store ?? "Blinkit")}`),
  heatmap: () => request<HeatmapEntry[]>("/groups/heatmap"),

  claimCoordinator: (groupId: string, deliveryFeePaise = 0) =>
    request<GroupDetail>(`/groups/${groupId}/claim-coordinator`, { method: "POST", body: JSON.stringify({ deliveryFeePaise }) }),
  myContribution: (groupId: string) => request<ContributionWithUpi>(`/groups/${groupId}/contributions/mine`),
  markPaid: (groupId: string) => request<Contribution>(`/groups/${groupId}/pay`, { method: "POST" }),
  confirmPayment: (groupId: string, userId: string) =>
    request<Contribution>(`/groups/${groupId}/contributions/${userId}/confirm`, { method: "POST" }),
  completeGroup: (groupId: string, body: { actualTotalPaise: number; proofImageUrl?: string }) =>
    request<GroupDetail>(`/groups/${groupId}/complete`, { method: "POST", body: JSON.stringify(body) }),
  raiseDispute: (groupId: string, reason: string) =>
    request<{ id: string }>(`/groups/${groupId}/dispute`, { method: "POST", body: JSON.stringify({ reason }) }),

  registerPushToken: (token: string, platform: "ios" | "android") =>
    request<void>("/push/register", { method: "POST", body: JSON.stringify({ token, platform }) }),
};
