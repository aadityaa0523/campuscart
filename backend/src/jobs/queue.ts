import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { loadEnv } from "../config/env.js";

export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

let _connection: Redis | undefined;
let _expiryQueue: Queue | undefined;
let _pushQueue: Queue<PushJobData> | undefined;

// Lazily created so importing this module doesn't open a Redis connection
// (or require REDIS_URL) until something actually enqueues a job.
function connection(): Redis {
  if (!_connection) _connection = new Redis(loadEnv().REDIS_URL, { maxRetriesPerRequest: null });
  return _connection;
}

export function expiryQueue(): Queue {
  if (!_expiryQueue) _expiryQueue = new Queue("expiry-sweep", { connection: connection() });
  return _expiryQueue;
}

export function pushQueue(): Queue<PushJobData> {
  if (!_pushQueue) _pushQueue = new Queue<PushJobData>("push-notifications", { connection: connection() });
  return _pushQueue;
}

/** Repeatable job registration is idempotent (BullMQ keys it by name + repeat
 * options + jobId), so calling this on every worker boot never duplicates
 * the sweep. Cadence matches the reference app's setInterval (15s) per spec §8. */
export async function scheduleExpirySweep(): Promise<void> {
  await expiryQueue().add("sweep", {}, { repeat: { every: 15_000 }, jobId: "expiry-sweep-repeat" });
}

export async function enqueuePush(job: PushJobData): Promise<void> {
  await pushQueue().add("notify", job);
}
