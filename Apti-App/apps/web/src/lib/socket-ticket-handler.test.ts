import { verifySocketTicket } from "@aptiquiz/socket-ticket";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSocketTicketPost } from "./socket-ticket-handler";

const secret = "test-secret-with-at-least-thirty-two-characters";
const now = Date.UTC(2026, 9, 10, 12);
const request = new Request("http://localhost:3000/api/socket-ticket", { method: "POST" });

describe("POST /api/socket-ticket", () => {
  it("returns 401 for a Guest and 403 for a suspended User", async () => {
    const guest = createSocketTicketPost({
      getSessionAccess: async () => ({ kind: "guest" }),
      getHomeCollegeId: async () => null,
      getSecret: () => secret,
      now: () => now,
    });
    const suspended = createSocketTicketPost({
      getSessionAccess: async () => ({ kind: "suspended" }),
      getHomeCollegeId: async () => null,
      getSecret: () => secret,
      now: () => now,
    });

    expect((await guest(request)).status).toBe(401);
    expect((await suspended(request)).status).toBe(403);
  });

  it("issues a fresh signed User ticket with current Admin role and verified status", async () => {
    vi.stubEnv("ADMIN_EMAILS", " admin@example.test ");
    const getSessionAccess = vi.fn(async () => ({
      kind: "active" as const,
      user: { id: "user-123", email: "ADMIN@EXAMPLE.TEST", emailVerified: true },
    }));
    let currentTime = now;
    const post = createSocketTicketPost({
      getSessionAccess,
      getHomeCollegeId: async () => null,
      getSecret: () => secret,
      now: () => currentTime,
    });

    const first = await post(request);
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    const firstTicket = (await first.json()).ticket;
    const verified = await verifySocketTicket(firstTicket, secret, now);
    expect(verified).toMatchObject({
      ok: true,
      claims: {
        userId: "user-123",
        role: "admin",
        homeCollegeId: null,
        emailVerified: true,
      },
    });

    currentTime += 2_000;
    const secondTicket = (await (await post(request)).json()).ticket;
    expect(secondTicket).not.toBe(firstTicket);
    expect(getSessionAccess).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });

  it("carries the current Home College and picks up a change on the next ticket", async () => {
    let homeCollegeId: string | null = "college_first";
    const getHomeCollegeId = vi.fn(async () => homeCollegeId);
    const post = createSocketTicketPost({
      getSessionAccess: async () => ({
        kind: "active" as const,
        user: { id: "user-456", email: "user@example.test", emailVerified: true },
      }),
      getHomeCollegeId,
      getSecret: () => secret,
      now: () => now,
    });
    const claimsOf = async () => {
      const { ticket } = await (await post(request)).json();
      const verified = await verifySocketTicket(ticket, secret, now);
      if (!verified.ok) throw new Error("ticket did not verify");
      return verified.claims;
    };

    expect((await claimsOf()).homeCollegeId).toBe("college_first");
    homeCollegeId = "college_second";
    expect((await claimsOf()).homeCollegeId).toBe("college_second");
    homeCollegeId = null;
    expect((await claimsOf()).homeCollegeId).toBeNull();
    expect(getHomeCollegeId).toHaveBeenCalledWith("user-456");
  });
});
