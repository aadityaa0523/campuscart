# CampusCart

Blinkit enforces a ₹150–200 minimum order. CampusCart lets nearby students on
one campus combine small orders into a single group order that crosses the
minimum, splits the cost back to each person by what they actually added,
and has one student ("the coordinator") place the real Blinkit order and
collect everyone else's share directly over UPI. CampusCart never places the
Blinkit order itself and never custodies money — see
[`docs/PRODUCTION_BUILD_SPEC.md`](docs/PRODUCTION_BUILD_SPEC.md) §7.

Built to [`docs/PRODUCTION_BUILD_SPEC.md`](docs/PRODUCTION_BUILD_SPEC.md), a
production-grade rewrite of the concept in
[`docs/CampusCart_Group_Ordering_Concept.md`](docs/CampusCart_Group_Ordering_Concept.md).

## Structure

- **[`backend/`](backend/)** — Fastify + Prisma + PostgreSQL + Redis API.
  Matching, cost-splitting, UPI links, reliability scoring, JWT auth with
  refresh rotation, Socket.io realtime, BullMQ background jobs, audit log,
  RBAC. See [`backend/README.md`](backend/README.md) for how to run it and
  exactly what's live vs. stubbed (Option B payment gateway, Expo push, file
  uploads — all wired, all disabled until you add the credentials they need).
- **`mobile/`** — Expo / React Native + TypeScript app: React Query, Zustand,
  React Hook Form + Zod, a small design-token system, realtime group updates,
  push notification registration, offline handling.

## Quick start

```bash
docker compose up -d postgres redis
cd backend && cp .env.example .env && npm install && npm run prisma:migrate && npm run dev
# separate terminal
cd backend && npm run worker
# separate terminal
cd mobile && cp .env.example .env && npm install && npm start
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck, unit
tests, and the full integration-test lifecycle (signup → create group →
match → join → cross threshold → claim coordinator → pay → complete)
against real Postgres/Redis service containers on every push and PR.
