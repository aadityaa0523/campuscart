import type { FastifyPluginAsync } from "fastify";
import { resolveDisputeSchema } from "../schemas/groups.js";
import { writeAuditLog } from "../lib/audit.js";

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/disputes", { preHandler: [app.authenticate, app.requireAdmin] }, async () => {
    return app.prisma.dispute.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" } });
  });

  app.patch("/admin/disputes/:id", { preHandler: [app.authenticate, app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = resolveDisputeSchema.parse(req.body);
    const dispute = await app.prisma.dispute.update({ where: { id }, data: { status: body.status, resolvedAt: new Date() } });
    await writeAuditLog(app.prisma, { userId: req.user!.id, action: "dispute.resolved", metadata: { disputeId: id, status: body.status }, ip: req.ip });
    return dispute;
  });
};

export default adminRoutes;
