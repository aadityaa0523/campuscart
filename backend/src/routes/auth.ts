import type { FastifyPluginAsync } from "fastify";
import { loginSchema, signupSchema, refreshSchema, authResponseSchema } from "../schemas/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from "../lib/jwt.js";
import { writeAuditLog } from "../lib/audit.js";

const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

const authRoutes: FastifyPluginAsync = async (app) => {
  async function issueTokenPair(userId: string, role: "STUDENT" | "ADMIN") {
    const accessToken = await signAccessToken({ sub: userId, role });
    const refreshToken = generateRefreshToken();
    await app.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return { accessToken, refreshToken };
  }

  app.post("/auth/signup", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const body = signupSchema.parse(req.body);
    const hostel = await app.prisma.hostel.findUnique({ where: { id: body.hostelId } });
    if (!hostel) return reply.code(400).send({ error: "unknown hostelId" });

    const existing = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: "email already registered" });

    const user = await app.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        hostelId: body.hostelId,
        passwordHash: await hashPassword(body.password),
      },
    });

    const tokens = await issueTokenPair(user.id, user.role);
    await writeAuditLog(app.prisma, { userId: user.id, action: "auth.signup", metadata: { email: user.email }, ip: req.ip });

    return authResponseSchema.parse({
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, hostelId: user.hostelId, role: user.role, reliabilityScore: user.reliabilityScore, upiVpa: user.upiVpa },
    });
  });

  app.post("/auth/login", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const lockKey = `loginfail:${body.email}`;
    const fails = Number((await app.redis.get(lockKey)) ?? 0);
    if (fails >= LOGIN_LOCKOUT_THRESHOLD) {
      return reply.code(429).send({ error: "too many failed attempts, try again later" });
    }

    const user = await app.prisma.user.findUnique({ where: { email: body.email } });
    const ok = user ? await verifyPassword(user.passwordHash, body.password) : false;
    if (!user || !ok) {
      await app.redis.multi().incr(lockKey).expire(lockKey, LOGIN_LOCKOUT_WINDOW_SECONDS).exec();
      await writeAuditLog(app.prisma, { userId: user?.id, action: "login.failed", metadata: { email: body.email }, ip: req.ip });
      return reply.code(401).send({ error: "invalid credentials" });
    }

    await app.redis.del(lockKey);
    const tokens = await issueTokenPair(user.id, user.role);
    await writeAuditLog(app.prisma, { userId: user.id, action: "auth.login", metadata: {}, ip: req.ip });

    return authResponseSchema.parse({
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, hostelId: user.hostelId, role: user.role, reliabilityScore: user.reliabilityScore, upiVpa: user.upiVpa },
    });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    const tokenHash = hashRefreshToken(body.refreshToken);
    const stored = await app.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) return reply.code(401).send({ error: "invalid refresh token" });

    if (stored.revoked) {
      // A revoked (already-rotated) refresh token being presented again means
      // it was stolen and used out of order — burn the whole session.
      await app.prisma.refreshToken.updateMany({ where: { userId: stored.userId, revoked: false }, data: { revoked: true } });
      await writeAuditLog(app.prisma, { userId: stored.userId, action: "refresh.reuse_detected", metadata: {}, ip: req.ip });
      return reply.code(401).send({ error: "token reuse detected, please log in again" });
    }

    if (stored.expiresAt < new Date()) {
      await app.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      return reply.code(401).send({ error: "refresh token expired" });
    }

    const user = await app.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return reply.code(401).send({ error: "invalid refresh token" });

    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);
    await app.prisma.$transaction([
      app.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true, replacedByHash: newHash } }),
      app.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) } }),
    ]);
    const accessToken = await signAccessToken({ sub: user.id, role: user.role });

    return authResponseSchema.parse({
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, name: user.name, hostelId: user.hostelId, role: user.role, reliabilityScore: user.reliabilityScore, upiVpa: user.upiVpa },
    });
  });

  app.post("/auth/logout", async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    await app.prisma.refreshToken.updateMany({ where: { tokenHash: hashRefreshToken(body.refreshToken) }, data: { revoked: true } });
    return reply.code(204).send();
  });

  app.post("/auth/logout-everywhere", { preHandler: app.authenticate }, async (req, reply) => {
    await app.prisma.refreshToken.updateMany({ where: { userId: req.user!.id, revoked: false }, data: { revoked: true } });
    return reply.code(204).send();
  });
};

export default authRoutes;
