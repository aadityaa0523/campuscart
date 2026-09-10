import type { FastifyPluginAsync } from "fastify";
import {
  createGroupSchema,
  joinGroupSchema,
  addItemsSchema,
  matchQuerySchema,
  claimCoordinatorSchema,
  completeGroupSchema,
  disputeSchema,
} from "../schemas/groups.js";
import { findBestMatch, type MatchCandidateGroup } from "../lib/matching.js";
import { splitCost, groupTotalPaise } from "../lib/splitting.js";
import { generateUpiLink } from "../lib/upi.js";
import { recomputeThresholdStatus, ACTIVE_STATUSES } from "../lib/groupStatus.js";
import { RELIABILITY_DELTAS, computeReliabilityScore } from "../lib/reliability.js";
import { writeAuditLog } from "../lib/audit.js";
import { broadcastGroupUpdate } from "../plugins/socket.js";
import { loadEnv } from "../config/env.js";
import { enqueuePush } from "../jobs/queue.js";

const groupRoutes: FastifyPluginAsync = async (app) => {
  const env = loadEnv();

  // Push delivery is best-effort — a Redis hiccup notifying students should
  // never fail the request that made the state change actually happen.
  function notify(userId: string, title: string, body: string) {
    enqueuePush({ userId, title, body }).catch((err) => app.log.warn(err, "push enqueue failed"));
  }

  async function notifyGroupMembers(groupOrderId: string, title: string, body: string) {
    const items = await app.prisma.groupItem.findMany({ where: { groupOrderId }, select: { userId: true } });
    for (const userId of new Set(items.map((i) => i.userId))) notify(userId, title, body);
  }

  async function serializeGroup(groupOrderId: string) {
    const group = await app.prisma.groupOrder.findUniqueOrThrow({
      where: { id: groupOrderId },
      include: { items: true, contributions: true },
    });
    const totalPaise = groupTotalPaise(group.items, group.deliveryFeePaise);
    return { ...group, totalPaise, remainingPaise: Math.max(0, group.thresholdPaise - totalPaise) };
  }

  async function addItemsAndRecompute(
    groupOrderId: string,
    userId: string,
    items: { name: string; pricePaise: number; quantity: number }[],
  ): Promise<{ error: 404 | 409; message: string } | { group: Awaited<ReturnType<typeof serializeGroup>> }> {
    const group = await app.prisma.groupOrder.findUnique({ where: { id: groupOrderId } });
    if (!group) return { error: 404, message: "group not found" };
    if (!ACTIVE_STATUSES.includes(group.status)) {
      return { error: 409, message: "group is no longer accepting items" };
    }
    await app.prisma.groupItem.createMany({
      data: items.map((item) => ({ groupOrderId, userId, name: item.name, pricePaise: item.pricePaise, quantity: item.quantity })),
    });
    const wasActive = group.status;
    const updated = await recomputeThresholdStatus(app.prisma, groupOrderId);
    if (wasActive !== "THRESHOLD_MET" && updated.status === "THRESHOLD_MET") {
      await notifyGroupMembers(groupOrderId, "Minimum order reached!", "Your group crossed the threshold — someone can claim coordinator now.");
    }
    const serialized = await serializeGroup(groupOrderId);
    broadcastGroupUpdate(app.io, groupOrderId, "group:update", serialized);
    return { group: serialized };
  }

  app.post("/groups", { preHandler: app.authenticate }, async (req, reply) => {
    const body = createGroupSchema.parse(req.body);
    const hostel = await app.prisma.hostel.findUnique({ where: { id: body.hostelId } });
    if (!hostel) return reply.code(400).send({ error: "unknown hostelId" });

    const group = await app.prisma.groupOrder.create({
      data: {
        hostelId: body.hostelId,
        store: body.store,
        thresholdPaise: env.GROUP_THRESHOLD_PAISE,
        expiresAt: new Date(Date.now() + env.GROUP_TTL_MINUTES * 60_000),
        items: { create: body.items.map((item) => ({ userId: req.user!.id, ...item })) },
      },
    });
    await recomputeThresholdStatus(app.prisma, group.id);
    return reply.code(201).send(await serializeGroup(group.id));
  });

  app.get("/groups/matches", { preHandler: app.authenticate }, async (req) => {
    const query = matchQuerySchema.parse(req.query);
    const candidates = await app.prisma.groupOrder.findMany({
      where: { hostelId: query.hostelId, store: query.store, status: { in: ACTIVE_STATUSES } },
      include: { items: true },
    });

    const withReliability: MatchCandidateGroup[] = await Promise.all(
      candidates.map(async (c) => {
        const memberIds = [...new Set(c.items.map((i) => i.userId))];
        const members = await app.prisma.user.findMany({ where: { id: { in: memberIds } }, select: { reliabilityScore: true } });
        return {
          id: c.id,
          hostelId: c.hostelId,
          store: c.store,
          createdAt: c.createdAt,
          currentTotalPaise: groupTotalPaise(c.items),
          thresholdPaise: c.thresholdPaise,
          memberReliabilityScores: members.map((m) => m.reliabilityScore),
        };
      }),
    );

    const ranked = findBestMatch(withReliability, { hostelId: query.hostelId, store: query.store });
    return ranked.map((r) => ({ ...r, group: candidates.find((c) => c.id === r.groupId) }));
  });

  app.get("/groups/heatmap", { preHandler: app.authenticate }, async () => {
    const hostels = await app.prisma.hostel.findMany();
    const groups = await app.prisma.groupOrder.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: { items: true },
    });
    return hostels.map((h) => {
      const hostelGroups = groups.filter((g) => g.hostelId === h.id);
      const pendingPaise = hostelGroups.reduce((sum, g) => sum + groupTotalPaise(g.items, g.deliveryFeePaise), 0);
      const ready = hostelGroups.some((g) => g.status === "THRESHOLD_MET");
      return { hostelId: h.id, hostelName: h.name, pendingPaise, ready, activeGroups: hostelGroups.length };
    });
  });

  app.get("/groups/:id", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const group = await app.prisma.groupOrder.findUnique({ where: { id } });
    if (!group) return reply.code(404).send({ error: "not found" });
    return serializeGroup(id);
  });

  app.post("/groups/:id/join", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = joinGroupSchema.parse(req.body);
    const result = await addItemsAndRecompute(id, req.user!.id, body.items);
    if ("error" in result) return reply.code(result.error).send({ error: result.message });
    return reply.code(201).send(result.group);
  });

  app.post("/groups/:id/items", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = addItemsSchema.parse(req.body);
    const result = await addItemsAndRecompute(id, req.user!.id, body.items);
    if ("error" in result) return reply.code(result.error).send({ error: result.message });
    return reply.code(201).send(result.group);
  });

  app.post("/groups/:id/claim-coordinator", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = claimCoordinatorSchema.parse(req.body);

    const [group, user] = await Promise.all([
      app.prisma.groupOrder.findUnique({ where: { id }, include: { items: true } }),
      app.prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } }),
    ]);
    if (!group) return reply.code(404).send({ error: "not found" });
    if (group.status !== "THRESHOLD_MET") return reply.code(409).send({ error: "group has not crossed the threshold yet" });
    if (!user.upiVpa) return reply.code(400).send({ error: "set your UPI VPA before becoming a coordinator" });

    const splits = splitCost(group.items, body.deliveryFeePaise);
    await app.prisma.$transaction([
      app.prisma.groupOrder.update({
        where: { id },
        data: { status: "AWAITING_PAYMENTS", coordinatorUserId: user.id, deliveryFeePaise: body.deliveryFeePaise },
      }),
      app.prisma.contribution.createMany({
        data: splits.map((s) => ({ groupOrderId: id, userId: s.userId, amountPaise: s.totalPaise })),
      }),
    ]);
    await writeAuditLog(app.prisma, { userId: user.id, action: "coordinator.claim", metadata: { groupOrderId: id }, ip: req.ip });
    for (const s of splits) notify(s.userId, "Pay your share", `${user.name} is placing the order — pay your share in the app.`);

    const serialized = await serializeGroup(id);
    broadcastGroupUpdate(app.io, id, "group:update", serialized);
    return serialized;
  });

  app.get("/groups/:id/contributions/mine", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [group, contribution] = await Promise.all([
      app.prisma.groupOrder.findUnique({ where: { id }, include: { coordinator: true } }),
      app.prisma.contribution.findUnique({ where: { groupOrderId_userId: { groupOrderId: id, userId: req.user!.id } } }),
    ]);
    if (!group || !contribution) return reply.code(404).send({ error: "not found" });
    if (!group.coordinator?.upiVpa) return reply.code(409).send({ error: "coordinator has no UPI VPA on file" });

    const upiLink = generateUpiLink({
      payeeVpa: group.coordinator.upiVpa,
      payeeName: group.coordinator.name,
      amountPaise: contribution.amountPaise,
      note: `CampusCart group ${id}`,
      txnRef: `${id}-${req.user!.id}`,
    });
    return { ...contribution, upiLink };
  });

  // Option A (peer-to-peer UPI): the student self-reports having paid. This
  // is trust-based by design — CampusCart never custodies funds, so it has
  // no independent way to observe a bank-to-bank transfer. Option B
  // (src/routes/webhooks.ts) replaces this with gateway-verified truth.
  app.post("/groups/:id/pay", { preHandler: app.authenticate }, async (req, reply) => {
    if (env.PAYMENT_WEBHOOK_SECRET) {
      return reply.code(409).send({ error: "this deployment verifies payments via gateway webhook only" });
    }
    const { id } = req.params as { id: string };
    const contribution = await app.prisma.contribution.findUnique({ where: { groupOrderId_userId: { groupOrderId: id, userId: req.user!.id } } });
    if (!contribution) return reply.code(404).send({ error: "not found" });
    const updated = await app.prisma.contribution.update({ where: { id: contribution.id }, data: { status: "CLAIMED_PAID" } });
    broadcastGroupUpdate(app.io, id, "contribution:update", updated);
    return updated;
  });

  app.post("/groups/:id/contributions/:userId/confirm", { preHandler: app.authenticate }, async (req, reply) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const group = await app.prisma.groupOrder.findUnique({ where: { id } });
    if (!group) return reply.code(404).send({ error: "not found" });
    if (group.coordinatorUserId !== req.user!.id) return reply.code(403).send({ error: "only the coordinator can confirm payments" });

    const contribution = await app.prisma.contribution.update({
      where: { groupOrderId_userId: { groupOrderId: id, userId } },
      data: { status: "PAID", paidAt: new Date() },
    });
    await app.prisma.reliabilityEvent.create({ data: { userId, type: "PAYMENT_CONFIRMED", delta: RELIABILITY_DELTAS.PAYMENT_CONFIRMED } });
    await writeAuditLog(app.prisma, { userId: req.user!.id, action: "payment.confirmed", metadata: { groupOrderId: id, payerId: userId }, ip: req.ip });
    notify(userId, "Payment confirmed", "The coordinator confirmed your payment.");
    broadcastGroupUpdate(app.io, id, "contribution:update", contribution);
    return contribution;
  });

  app.post("/groups/:id/complete", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = completeGroupSchema.parse(req.body);
    const group = await app.prisma.groupOrder.findUnique({ where: { id }, include: { contributions: true } });
    if (!group) return reply.code(404).send({ error: "not found" });
    if (group.coordinatorUserId !== req.user!.id) return reply.code(403).send({ error: "only the coordinator can complete this order" });
    if (group.status !== "AWAITING_PAYMENTS") return reply.code(409).send({ error: "group is not awaiting completion" });

    await app.prisma.groupOrder.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date(), actualTotalPaise: body.actualTotalPaise, proofImageUrl: body.proofImageUrl },
    });

    const events: { userId: string; type: "ORDER_COMPLETED" | "PAYMENT_MISSED" | "COORDINATOR_COMPLETED"; delta: number }[] =
      group.contributions.map((c) => ({
        userId: c.userId,
        type: c.status === "PAID" ? "ORDER_COMPLETED" : "PAYMENT_MISSED",
        delta: c.status === "PAID" ? RELIABILITY_DELTAS.ORDER_COMPLETED : RELIABILITY_DELTAS.PAYMENT_MISSED,
      }));
    events.push({ userId: group.coordinatorUserId!, type: "COORDINATOR_COMPLETED", delta: RELIABILITY_DELTAS.COORDINATOR_COMPLETED });

    await app.prisma.reliabilityEvent.createMany({ data: events });
    await recalculateReliability(app.prisma, [...new Set(events.map((e) => e.userId))]);
    await writeAuditLog(app.prisma, { userId: req.user!.id, action: "order.completed", metadata: { groupOrderId: id }, ip: req.ip });
    await notifyGroupMembers(id, "Order completed", "Your CampusCart group order is complete.");

    const serialized = await serializeGroup(id);
    broadcastGroupUpdate(app.io, id, "group:update", serialized);
    return serialized;
  });

  app.post("/groups/:id/dispute", { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = disputeSchema.parse(req.body);
    const group = await app.prisma.groupOrder.findUnique({ where: { id } });
    if (!group) return reply.code(404).send({ error: "not found" });

    const dispute = await app.prisma.dispute.create({ data: { groupOrderId: id, raisedBy: req.user!.id, reason: body.reason } });
    await app.prisma.groupOrder.update({ where: { id }, data: { status: "DISPUTED" } });
    await writeAuditLog(app.prisma, { userId: req.user!.id, action: "dispute.raised", metadata: { groupOrderId: id, reason: body.reason }, ip: req.ip });
    broadcastGroupUpdate(app.io, id, "group:disputed", dispute);
    return reply.code(201).send(dispute);
  });
};

async function recalculateReliability(prisma: import("@prisma/client").PrismaClient, userIds: string[]) {
  for (const userId of userIds) {
    const events = await prisma.reliabilityEvent.findMany({ where: { userId }, select: { delta: true } });
    const score = computeReliabilityScore(events);
    await prisma.user.update({ where: { id: userId }, data: { reliabilityScore: score } });
  }
}

export default groupRoutes;
