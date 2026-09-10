import argon2 from "argon2";

// OWASP-recommended argon2id parameters: memory >= 19 MiB, iterations >= 2.
const OPTS = { type: argon2.argon2id, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 };

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}
