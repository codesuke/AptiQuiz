import { describe, expect, it, vi } from "vitest";
import { obtainHostAccess, SetupError } from "./setup.js";

const setup = { kind: "web", webUrl: "http://web", hostCookie: "session=abc" } as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("obtainHostAccess", () => {
  it("creates a starter Room then a Host ticket with the Host session", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ roomId: "room-1", joinCode: "ABC234" }))
      .mockResolvedValueOnce(jsonResponse({ ticket: "ticket-1" }));

    const access = await obtainHostAccess(setup, fetchMock);

    expect(access).toEqual({ roomId: "room-1", hostTicket: "ticket-1" });
    const [roomCall, ticketCall] = fetchMock.mock.calls;
    expect(roomCall?.[0]).toBe("http://web/api/rooms");
    expect(JSON.parse(String(roomCall?.[1]?.body))).toMatchObject({
      questionSetId: "starter-aptitude-practice",
    });
    expect(ticketCall?.[0]).toBe("http://web/api/socket-ticket");
    expect(new Headers(roomCall?.[1]?.headers).get("cookie")).toBe("session=abc");
  });

  it("fails clearly when the Host is not authorized", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "home_college_required" }, 409));
    await expect(obtainHostAccess(setup, fetchMock)).rejects.toThrow(
      "Room creation: HTTP 409 home_college_required",
    );
  });

  it("fails when the web application is unreachable, without leaking the cookie", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("boom session=abc"));
    const failure = await obtainHostAccess(setup, fetchMock).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SetupError);
    expect(String((failure as Error).message)).not.toContain("session=abc");
  });

  it("passes a supplied Room and ticket through unchanged", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(
      obtainHostAccess({ kind: "supplied", roomId: "r", hostTicket: "t" }, fetchMock),
    ).resolves.toEqual({ roomId: "r", hostTicket: "t" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
