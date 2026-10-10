import type { SocketTicketSubject } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { issueSocketTicket, SOCKET_TICKET_LIFETIME_MS, verifySocketTicket } from "./index.js";

const secret = "test-secret-with-at-least-32-characters";
const ONE_SECOND_MS = 1_000;
const issuedAt = Date.UTC(2026, 9, 10, 12, 0, 0);
const issuedAtSeconds = issuedAt / ONE_SECOND_MS;
const lifetimeSeconds = SOCKET_TICKET_LIFETIME_MS / ONE_SECOND_MS;
const subject: SocketTicketSubject = {
  userId: "user_123",
  role: "admin",
  homeCollegeId: null,
  emailVerified: true,
};

describe("socket tickets", () => {
  it("accepts a valid ticket and returns its claims", async () => {
    const ticket = await issueSocketTicket(subject, secret, issuedAt);

    await expect(verifySocketTicket(ticket, secret, issuedAt + ONE_SECOND_MS)).resolves.toEqual({
      ok: true,
      claims: {
        ...subject,
        issuedAt,
        expiresAt: issuedAt + SOCKET_TICKET_LIFETIME_MS,
        audience: "aptiquiz-game-server",
      },
    });
  });

  it("expires sixty seconds after issue", async () => {
    const ticket = await issueSocketTicket(subject, secret, issuedAt);

    await expect(
      verifySocketTicket(ticket, secret, issuedAt + SOCKET_TICKET_LIFETIME_MS + ONE_SECOND_MS),
    ).resolves.toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a ticket signed with a different secret", async () => {
    const ticket = await issueSocketTicket(
      subject,
      "another-secret-with-32-characters!!",
      issuedAt,
    );

    await expect(verifySocketTicket(ticket, secret, issuedAt)).resolves.toEqual({
      ok: false,
      reason: "tampered",
    });
  });

  it("rejects a ticket whose claims were altered after signing", async () => {
    const ticket = await issueSocketTicket({ ...subject, role: "user" }, secret, issuedAt);
    const [header, , signature] = ticket.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "user_123", role: "admin", aud: "aptiquiz-game-server" }),
    ).toString("base64url");

    await expect(
      verifySocketTicket(`${header}.${forgedPayload}.${signature}`, secret, issuedAt),
    ).resolves.toEqual({ ok: false, reason: "tampered" });
  });

  it("rejects a ticket issued for another audience", async () => {
    const { SignJWT } = await import("jose");
    const ticket = await new SignJWT({ role: "user", homeCollegeId: null, emailVerified: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setAudience("another-service")
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(issuedAtSeconds + lifetimeSeconds)
      .sign(new TextEncoder().encode(secret));

    await expect(verifySocketTicket(ticket, secret, issuedAt)).resolves.toEqual({
      ok: false,
      reason: "wrong_audience",
    });
  });

  it.each(["", "not-a-jwt", "a.b.c"])("rejects malformed ticket %j", async (ticket) => {
    await expect(verifySocketTicket(ticket, secret, issuedAt)).resolves.toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects a correctly signed ticket with invalid claims", async () => {
    const { SignJWT } = await import("jose");
    const ticket = await new SignJWT({ role: "superuser" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setAudience("aptiquiz-game-server")
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(issuedAtSeconds + lifetimeSeconds)
      .sign(new TextEncoder().encode(secret));

    await expect(verifySocketTicket(ticket, secret, issuedAt)).resolves.toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});
