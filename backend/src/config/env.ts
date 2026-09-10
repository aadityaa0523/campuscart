import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (openssl rand -hex 32)"),
  CORS_ORIGINS: z.string().default(""), // comma-separated allowlist, never "*" in production
  GROUP_THRESHOLD_PAISE: z.coerce.number().default(20000), // ₹200
  GROUP_TTL_MINUTES: z.coerce.number().default(60),
  // Option B (Razorpay/Cashfree) — unset in the MVP deployment, see src/routes/webhooks.ts
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  EXPO_PUSH_ENABLED: z.coerce.boolean().default(false),
  // Run the expiry-sweep/push BullMQ workers inside the API process instead
  // of a separate one — for hosts whose free tier has no worker process
  // type (e.g. Render). See src/jobs/workers.ts.
  RUN_WORKERS_INLINE: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

export function corsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}
