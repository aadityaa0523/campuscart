# CampusCart backend

Fastify + Prisma + PostgreSQL + Redis. Implements the group-ordering,
matching, splitting, UPI-link, and reliability logic described in
[`docs/PRODUCTION_BUILD_SPEC.md`](../docs/PRODUCTION_BUILD_SPEC.md) and
[`docs/CampusCart_Group_Ordering_Concept.md`](../docs/CampusCart_Group_Ordering_Concept.md).

## Run locally

```bash
docker compose up -d postgres redis   # from the repo root
cp .env.example .env                  # defaults already match docker-compose
npm install
npm run prisma:migrate                # applies migrations + seeds hostels
npm run dev                           # API on :3000
npm run worker                        # separate terminal: expiry sweep + push delivery
```

`GET /health` and `GET /ready` are the liveness/readiness probes.

## Tests

```bash
npm test               # unit tests — pure business logic, no DB needed
npm run test:integration   # full lifecycle against real Postgres/Redis (needs docker compose up)
```

## What's live vs. stubbed

This ships Option A (peer-to-peer UPI) fully working end to end: real
matching, splitting, UPI deep links, self-reported payment + coordinator
confirmation, reliability scoring, disputes, audit log, JWT auth with
refresh rotation, Redis-backed rate limiting, Socket.io realtime, BullMQ
expiry sweep. Nothing here needs a paid account to run.

Explicitly stubbed, because they require credentials/accounts this build
can't provision on your behalf — the integration point is real and tested
where it can be, disabled by default otherwise:

- **Option B (Razorpay/Cashfree)** — `POST /webhooks/payment` verifies an
  HMAC signature and flips a contribution to `PAID`, but 501s until you set
  `PAYMENT_WEBHOOK_SECRET` and point the payload shape at your gateway.
- **Expo push delivery** — the worker calls Expo's push API for real once
  `EXPO_PUSH_ENABLED=true` and the mobile app has registered real tokens;
  off by default so CI doesn't need a live Expo project.
- **Dispute/proof-of-order file uploads** — `proofImageUrl` is a plain URL
  field; wire an actual upload pipeline (S3/R2/Cloudinary + virus scan per
  spec §7) when you have those credentials, rather than storing files on
  the API instance's disk.
- **Sentry, managed Postgres/Redis, EAS Build** — infra/account setup, not
  code; `docker-compose.yml` covers local dev, `Dockerfile` is ready to
  deploy to Render/Railway/Fly/ECS as-is.
