import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { loadEnv, corsOrigins } from "./config/env.js";

import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import authPlugin from "./plugins/auth.js";
import socketPlugin from "./plugins/socket.js";

import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import userRoutes from "./routes/users.js";
import pushRoutes from "./routes/push.js";
import webhookRoutes from "./routes/webhooks.js";
import adminRoutes from "./routes/admin.js";
import healthRoutes from "./routes/health.js";

export async function buildServer() {
  const env = loadEnv();
  const app = Fastify({
    logger: { transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined },
  });

  // Capture the raw body so /webhooks/payment can verify an HMAC signature
  // over the exact bytes the gateway signed — JSON.parse output wouldn't
  // round-trip byte-for-byte (key order, whitespace).
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    req.rawBody = body as Buffer;
    if (body.length === 0) return done(null, undefined);
    try {
      done(null, JSON.parse(body.toString("utf8")));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(helmet);
  await app.register(cors, { origin: corsOrigins(env).length ? corsOrigins(env) : false });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    redis: app.redis,
  });
  await app.register(authPlugin);
  await app.register(socketPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(groupRoutes);
  await app.register(userRoutes);
  await app.register(pushRoutes);
  await app.register(webhookRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((err: FastifyError | ZodError, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation failed", issues: err.issues });
    }
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    return reply.code(statusCode).send({ error: statusCode >= 500 ? "internal server error" : err.message });
  });

  return app;
}
