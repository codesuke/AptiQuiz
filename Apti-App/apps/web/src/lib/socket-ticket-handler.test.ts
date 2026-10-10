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
      getSecret: () => secret,
      now: () => now,
    });
    const suspended = createSocketTicketPost({
      getSessionAccess: async () => ({ kind: "suspended" }),
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
});
