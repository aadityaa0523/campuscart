import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

const pushRoutes: FastifyPluginAsync = async (app) => {
  app.post("/push/register", { preHandler: app.authenticate }, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    await app.prisma.pushToken.upsert({
      where: { token: body.token },
      create: { userId: req.user!.id, token: body.token, platform: body.platform },
      update: { userId: req.user!.id, platform: body.platform },
    });
    return reply.code(204).send();
  });
};

export default pushRoutes;
