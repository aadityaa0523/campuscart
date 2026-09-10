// Standalone worker process entry point (npm run worker / docker-compose's
// `worker` service). For hosts without a separate worker process type, see
// RUN_WORKERS_INLINE in src/index.ts instead.
import { startWorkers } from "./workers.js";

await startWorkers();
