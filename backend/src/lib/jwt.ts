import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";

export interface AccessTokenPayload {
  sub: string; // userId
  role: "STUDENT" | "ADMIN";
}

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return { sub: payload.sub as string, role: payload.role as AccessTokenPayload["role"] };
}

/** Refresh tokens are opaque high-entropy strings, never JWTs — the server
 * is the only party that needs to look them up, and an opaque token can't be
 * inspected or forged client-side. Only the sha256 hash is ever persisted,
 * so a DB leak doesn't hand out live refresh tokens. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
