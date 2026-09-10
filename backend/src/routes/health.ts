import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async (_req, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      await app.redis.ping();
      return { status: "ready" };
    } catch (err) {
      app.log.error(err, "readiness check failed");
      return reply.code(503).send({ status: "not ready" });
    }
  });
};

export default healthRoutes;
