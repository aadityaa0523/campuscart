import { buildServer } from "./server.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = await buildServer();
await app.listen({ port: env.PORT, host: "0.0.0.0" });

if (env.RUN_WORKERS_INLINE) {
  const { startWorkers } = await import("./jobs/workers.js");
  await startWorkers();
}
