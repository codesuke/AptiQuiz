import { describe, expect, it, vi } from "vitest";
import { requestSocketAuth } from "./socket-auth";

describe("requestSocketAuth", () => {
  it("requests a new Socket Ticket on every connection attempt", async () => {
    const fetchTicket = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ticket: "first-ticket" }))
      .mockResolvedValueOnce(Response.json({ ticket: "second-ticket" }));

    expect(await requestSocketAuth(fetchTicket)).toEqual({ ticket: "first-ticket" });
    expect(await requestSocketAuth(fetchTicket)).toEqual({ ticket: "second-ticket" });
    expect(fetchTicket).toHaveBeenCalledTimes(2);
    expect(fetchTicket).toHaveBeenCalledWith("/api/socket-ticket", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  });

  it("connects as Guest only for an explicit no-session response", async () => {
    expect(await requestSocketAuth(async () => new Response(null, { status: 401 }))).toEqual({});
    expect(await requestSocketAuth(async () => new Response(null, { status: 403 }))).toEqual({
      ticket: "",
    });
    expect(await requestSocketAuth(async () => Response.json({ ticket: 123 }))).toEqual({
      ticket: "",
    });
  });
});
