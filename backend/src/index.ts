import { buildServer } from "./server.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = await buildServer();
await app.listen({ port: env.PORT, host: "0.0.0.0" });
