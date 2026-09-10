import type { FastifyPluginAsync } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { loadEnv } from "../config/env.js";
import { broadcastGroupUpdate } from "../plugins/socket.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

// Payload shape is written for Razorpay-style webhooks (payment_id, order
// reference, signature header) — swap the header name / field names here if
// you integrate Cashfree instead. Everything else (verify-then-trust) holds.
const webhookPayloadSchema = z.object({
  contributionId: z.string(),
  paymentId: z.string(),
});

function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Option B (§7): the aggregator's signed webhook is the ONLY thing allowed
  // to mark a Contribution PAID once this is enabled. An unsigned or
  // badly-signed call is treated as an attack, not a bug — reject, don't log
  // and continue. Disabled deployments (no PAYMENT_WEBHOOK_SECRET, the MVP
  // default) 501 here; payment truth then comes from Option A self-report
  // + coordinator confirmation in src/routes/groups.ts instead.
  app.post("/webhooks/payment", async (req, reply) => {
    const env = loadEnv();
    if (!env.PAYMENT_WEBHOOK_SECRET) {
      return reply.code(501).send({ error: "payment gateway webhook not configured on this deployment" });
    }

    const signature = req.headers["x-webhook-signature"] as string | undefined;
    if (!req.rawBody || !verifySignature(req.rawBody, signature, env.PAYMENT_WEBHOOK_SECRET)) {
      return reply.code(401).send({ error: "invalid webhook signature" });
    }

    const body = webhookPayloadSchema.parse(req.body);
    const contribution = await app.prisma.contribution.update({
      where: { id: body.contributionId },
      data: { status: "PAID", paidAt: new Date(), paymentGatewayRef: body.paymentId, verifiedByWebhook: true },
    });
    broadcastGroupUpdate(app.io, contribution.groupOrderId, "contribution:update", contribution);
    return reply.code(204).send();
  });
};

export default webhookRoutes;
