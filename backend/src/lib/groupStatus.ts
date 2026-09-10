import { GroupStatus, type PrismaClient } from "@prisma/client";
import { groupTotalPaise } from "./splitting.js";

/** Statuses that still accept joined items / new items. */
export const ACTIVE_STATUSES: GroupStatus[] = [GroupStatus.OPEN, GroupStatus.THRESHOLD_MET];

/** Recomputes OPEN <-> THRESHOLD_MET from current items. Only touches those
 * two pre-claim states — once a coordinator has claimed the group (or it's
 * completed/expired/disputed) item totals no longer drive status. */
export async function recomputeThresholdStatus(prisma: PrismaClient, groupOrderId: string) {
  const group = await prisma.groupOrder.findUniqueOrThrow({ where: { id: groupOrderId }, include: { items: true } });
  if (group.status !== "OPEN" && group.status !== "THRESHOLD_MET") return group;

  const totalPaise = groupTotalPaise(group.items);
  const nextStatus = totalPaise >= group.thresholdPaise ? "THRESHOLD_MET" : "OPEN";
  if (nextStatus === group.status) return { ...group, totalPaise };

  const updated = await prisma.groupOrder.update({ where: { id: groupOrderId }, data: { status: nextStatus }, include: { items: true } });
  return { ...updated, totalPaise };
}
