import type { Prisma, PrismaClient } from "@prisma/client";

/** Every money- or auth-affecting action writes one of these. Append-only —
 * this is what settles "I paid and they say I didn't" disputes. */
export function writeAuditLog(
  prisma: PrismaClient,
  entry: { userId?: string | null; action: string; metadata: Prisma.InputJsonObject; ip?: string | null },
) {
  return prisma.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      metadata: entry.metadata,
      ip: entry.ip ?? null,
    },
  });
}
