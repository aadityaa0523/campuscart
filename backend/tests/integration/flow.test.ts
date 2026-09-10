import { beforeAll, afterAll, describe, it, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../../src/server.js";

// Requires a real Postgres + Redis (docker compose up -d, then
// `npm run prisma:migrate` against the test DB). CI provisions both as
// service containers — see .github/workflows/ci.yml. This is the same
// signup → create group → match → join → cross threshold → claim
// coordinator → pay → complete scenario the spec asks to port from the
// reference app's tests/run.ts.
//
// Uses Fastify's built-in `app.inject()` rather than Supertest: it runs
// requests through the exact same plugin/route pipeline against the real
// Postgres/Redis, without binding a port — one fewer dependency for the
// same coverage. Swap in Supertest against `app.server` if you need to
// exercise a real socket (e.g. testing an actual keep-alive/timeout).
describe("group order lifecycle", () => {
  let app: FastifyInstance;
  const suffix = Date.now();
  const hostelName = `Test Hostel ${suffix}`;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long-xxxx";
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signup(email: string, hostelId: string) {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email, password: "correct-horse-battery", name: email.split("@")[0], hostelId },
    });
    expect(res.statusCode).toBe(200);
    return res.json() as { accessToken: string; user: { id: string } };
  }

  function auth(token: string) {
    return { authorization: `Bearer ${token}` };
  }

  it("runs the full lifecycle and never loses or invents money", async () => {
    const hostel = await app.prisma.hostel.create({ data: { name: hostelName } });

    const a = await signup(`a-${suffix}@campus.edu`, hostel.id);
    const b = await signup(`b-${suffix}@campus.edu`, hostel.id);

    // A starts a group with ₹120 of items.
    const createRes = await app.inject({
      method: "POST",
      url: "/groups",
      headers: auth(a.accessToken),
      payload: { hostelId: hostel.id, items: [{ name: "Maggi", pricePaise: 4500, quantity: 1 }, { name: "Coke", pricePaise: 7500, quantity: 1 }] },
    });
    expect(createRes.statusCode).toBe(201);
    const group = createRes.json();
    expect(group.status).toBe("OPEN");
    expect(group.totalPaise).toBe(12000);

    // B should see it as a match candidate in the same hostel.
    const matchRes = await app.inject({
      method: "GET",
      url: `/groups/matches?hostelId=${hostel.id}&store=Blinkit`,
      headers: auth(b.accessToken),
    });
    expect(matchRes.statusCode).toBe(200);
    const matches = matchRes.json();
    expect(matches.some((m: { groupId: string }) => m.groupId === group.id)).toBe(true);

    // B joins with ₹90 more, crossing the ₹200 threshold.
    const joinRes = await app.inject({
      method: "POST",
      url: `/groups/${group.id}/join`,
      headers: auth(b.accessToken),
      payload: { items: [{ name: "Chips", pricePaise: 9000, quantity: 1 }] },
    });
    expect(joinRes.statusCode).toBe(201);
    expect(joinRes.json().status).toBe("THRESHOLD_MET");
    expect(joinRes.json().totalPaise).toBe(21000);

    // B sets a UPI VPA (required before claiming coordinator) and claims.
    await app.inject({ method: "PATCH", url: "/users/me", headers: auth(b.accessToken), payload: { upiVpa: "b@upi" } });
    const claimRes = await app.inject({
      method: "POST",
      url: `/groups/${group.id}/claim-coordinator`,
      headers: auth(b.accessToken),
      payload: { deliveryFeePaise: 1000 },
    });
    expect(claimRes.statusCode).toBe(200);
    const claimed = claimRes.json();
    expect(claimed.status).toBe("AWAITING_PAYMENTS");
    expect(claimed.coordinatorUserId).toBe(b.user.id);

    const contributions = claimed.contributions as { userId: string; amountPaise: number }[];
    const totalContributions = contributions.reduce((sum, c) => sum + c.amountPaise, 0);
    expect(totalContributions).toBe(21000 + 1000); // items + delivery fee, split exactly — no paise lost

    // A fetches their contribution + a upi:// deep link, then self-reports payment.
    const mineRes = await app.inject({ method: "GET", url: `/groups/${group.id}/contributions/mine`, headers: auth(a.accessToken) });
    expect(mineRes.statusCode).toBe(200);
    expect(mineRes.json().upiLink).toMatch(/^upi:\/\/pay\?/);

    const payRes = await app.inject({ method: "POST", url: `/groups/${group.id}/pay`, headers: auth(a.accessToken) });
    expect(payRes.statusCode).toBe(200);
    expect(payRes.json().status).toBe("CLAIMED_PAID");

    // Coordinator confirms both A's and their own contribution.
    for (const userId of [a.user.id, b.user.id]) {
      const confirmRes = await app.inject({
        method: "POST",
        url: `/groups/${group.id}/contributions/${userId}/confirm`,
        headers: auth(b.accessToken),
      });
      expect(confirmRes.statusCode).toBe(200);
      expect(confirmRes.json().status).toBe("PAID");
    }

    // Coordinator completes the order.
    const completeRes = await app.inject({
      method: "POST",
      url: `/groups/${group.id}/complete`,
      headers: auth(b.accessToken),
      payload: { actualTotalPaise: 22000 },
    });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.json().status).toBe("COMPLETED");

    // Reliability events were recorded for both the payer and the coordinator.
    const events = await app.prisma.reliabilityEvent.findMany({ where: { userId: { in: [a.user.id, b.user.id] } } });
    expect(events.some((e) => e.userId === a.user.id && e.type === "PAYMENT_CONFIRMED")).toBe(true);
    expect(events.some((e) => e.userId === b.user.id && e.type === "COORDINATOR_COMPLETED")).toBe(true);

    // Every money-affecting step left an audit trail.
    const auditActions = (await app.prisma.auditLog.findMany({ where: { userId: { in: [a.user.id, b.user.id] } } })).map((l) => l.action);
    expect(auditActions).toEqual(expect.arrayContaining(["coordinator.claim", "payment.confirmed", "order.completed"]));
  });

  it("rejects invalid credentials and locks out after repeated failures", async () => {
    const hostel = await app.prisma.hostel.create({ data: { name: `${hostelName}-auth` } });
    const email = `lockout-${suffix}@campus.edu`;
    await signup(email, hostel.id);

    let last;
    for (let i = 0; i < 6; i++) {
      last = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password: "wrong-password" } });
    }
    expect(last!.statusCode).toBe(429);
  });

  it("raises and resolves a dispute", async () => {
    const hostel = await app.prisma.hostel.create({ data: { name: `${hostelName}-dispute` } });
    const a = await signup(`dispute-a-${suffix}@campus.edu`, hostel.id);
    const admin = await signup(`dispute-admin-${suffix}@campus.edu`, hostel.id);
    await app.prisma.user.update({ where: { id: admin.user.id }, data: { role: "ADMIN" } });
    const adminLogin = await app.inject({ method: "POST", url: "/auth/login", payload: { email: `dispute-admin-${suffix}@campus.edu`, password: "correct-horse-battery" } });
    const adminToken = adminLogin.json().accessToken as string;

    const group = (
      await app.inject({
        method: "POST",
        url: "/groups",
        headers: auth(a.accessToken),
        payload: { hostelId: hostel.id, items: [{ name: "Item", pricePaise: 5000, quantity: 1 }] },
      })
    ).json();

    const disputeRes = await app.inject({
      method: "POST",
      url: `/groups/${group.id}/dispute`,
      headers: auth(a.accessToken),
      payload: { reason: "Coordinator never placed the order." },
    });
    expect(disputeRes.statusCode).toBe(201);

    const resolveRes = await app.inject({
      method: "PATCH",
      url: `/admin/disputes/${disputeRes.json().id}`,
      headers: auth(adminToken),
      payload: { status: "RESOLVED" },
    });
    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.json().status).toBe("RESOLVED");

    // A non-admin can't resolve disputes.
    const forbidden = await app.inject({
      method: "PATCH",
      url: `/admin/disputes/${disputeRes.json().id}`,
      headers: auth(a.accessToken),
      payload: { status: "REJECTED" },
    });
    expect(forbidden.statusCode).toBe(403);
  });
});
