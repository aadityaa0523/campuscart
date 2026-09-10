import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { loadEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (app: FastifyInstance) => {
  const env = loadEnv();
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  app.decorate("redis", redis);
  app.addHook("onClose", async (instance) => {
    instance.redis.disconnect();
  });
});
