import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { Emitter } from "@socket.io/redis-emitter";
import { loadEnv } from "../config/env.js";
import { scheduleExpirySweep, type PushJobData } from "./queue.js";
import { ACTIVE_STATUSES } from "../lib/groupStatus.js";

/**
 * Starts the expiry-sweep and push-notification BullMQ workers. Callable
 * either from a dedicated worker process (src/jobs/worker.ts — the
 * spec's intended shape: horizontally scale API and workers separately) or
 * inline inside the API process via RUN_WORKERS_INLINE=true, for hosts
 * whose free tier only offers one process type (e.g. Render's free plan has
 * no Background Worker service — see render.yaml). Fine at this scale;
 * split them again once request volume and job volume need to scale apart.
 */
export async function startWorkers(): Promise<void> {
  const env = loadEnv();
  const prisma = new PrismaClient();
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  // A Redis emitter lets a process without its own Socket.io server
  // broadcast into the same rooms the API's Socket.io instance serves (see
  // src/plugins/socket.ts for the API-side adapter).
  const emitter = new Emitter(connection);

  const expiryWorker = new Worker(
    "expiry-sweep",
    async () => {
      const expired = await prisma.groupOrder.findMany({
        where: { status: { in: ACTIVE_STATUSES }, expiresAt: { lt: new Date() } },
      });
      for (const group of expired) {
        await prisma.groupOrder.update({ where: { id: group.id }, data: { status: "EXPIRED" } });
        emitter.to(`group:${group.id}`).emit("group:update", { id: group.id, status: "EXPIRED" });
      }
      return { swept: expired.length };
    },
    { connection },
  );

  // Expo's push API needs no server-side secret — it accepts any request
  // bearing valid ExpoPushToken values, which only a real Expo-built app can
  // register (see POST /push/register). EXPO_PUSH_ENABLED just lets a
  // deployment turn delivery off (e.g. in CI) without touching this code.
  const pushWorker = new Worker<PushJobData>(
    "push-notifications",
    async (job) => {
      if (!env.EXPO_PUSH_ENABLED) return { skipped: true };
      const tokens = await prisma.pushToken.findMany({ where: { userId: job.data.userId } });
      if (tokens.length === 0) return { delivered: 0 };

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: job.data.title, body: job.data.body, data: job.data.data }))),
      });
      return { delivered: tokens.length };
    },
    { connection },
  );

  for (const worker of [expiryWorker, pushWorker]) {
    worker.on("failed", (job, err) => console.error(`[worker] ${job?.queueName} job ${job?.id} failed:`, err));
  }

  await scheduleExpirySweep();
  console.log("CampusCart workers running: expiry-sweep, push-notifications");
}
