import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyAccessToken } from "../lib/jwt.js";
import { corsOrigins, loadEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

/**
 * Socket.io + the Redis adapter is what makes a group-order update
 * broadcast from any API instance reach a client connected to any other
 * instance (spec §8) — a bare Socket.io server's room membership only lives
 * in one process.
 */
export default fp(async (app: FastifyInstance) => {
  const env = loadEnv();
  const io = new SocketIOServer(app.server, {
    cors: { origin: corsOrigins(env).length ? corsOrigins(env) : false },
  });

  const pub = app.redis.duplicate();
  const sub = app.redis.duplicate();
  io.adapter(createAdapter(pub, sub));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("missing token");
      const payload = await verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("group:subscribe", (groupOrderId: string) => {
      if (typeof groupOrderId === "string") socket.join(`group:${groupOrderId}`);
    });
    socket.on("group:unsubscribe", (groupOrderId: string) => {
      if (typeof groupOrderId === "string") socket.leave(`group:${groupOrderId}`);
    });
  });

  app.decorate("io", io);
  app.addHook("onClose", async (instance) => {
    await instance.io.close();
    pub.disconnect();
    sub.disconnect();
  });
});

export function broadcastGroupUpdate(io: SocketIOServer, groupOrderId: string, event: string, payload: unknown) {
  io.to(`group:${groupOrderId}`).emit(event, payload);
}
