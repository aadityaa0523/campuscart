import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { isValidVpa } from "../lib/upi.js";

const updateMeSchema = z.object({ upiVpa: z.string().min(1).max(100) });

const userRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/me", { preHandler: app.authenticate }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return reply.code(404).send({ error: "not found" });
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  });

  app.patch("/users/me", { preHandler: app.authenticate }, async (req, reply) => {
    const body = updateMeSchema.parse(req.body);
    if (!isValidVpa(body.upiVpa)) return reply.code(400).send({ error: "invalid UPI VPA" });
    const user = await app.prisma.user.update({ where: { id: req.user!.id }, data: { upiVpa: body.upiVpa } });
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  });

  app.get("/hostels", { preHandler: app.authenticate }, async () => {
    return app.prisma.hostel.findMany();
  });
};

export default userRoutes;
