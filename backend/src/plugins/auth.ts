import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: { id: string; role: "STUDENT" | "ADMIN" };
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "missing bearer token" });
    }
    try {
      const payload = await verifyAccessToken(header.slice("Bearer ".length));
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      return reply.code(401).send({ error: "invalid or expired token" });
    }
  });

  // Privileged routes re-verify the role against the DB rather than trusting
  // the JWT claim alone — closes the window where a just-revoked admin's
  // still-live 15-minute access token would otherwise keep working.
  app.decorate("requireAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: "unauthenticated" });
    const user = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      return reply.code(403).send({ error: "admin role required" });
    }
  });
});
