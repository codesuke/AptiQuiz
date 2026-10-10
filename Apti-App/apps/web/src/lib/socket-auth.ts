import { type SocketHandshakeAuth, socketHandshakeAuthSchema } from "@aptiquiz/contracts";

const invalidTicket: SocketHandshakeAuth = { ticket: "" };

export async function requestSocketAuth(
  fetchTicket: typeof fetch = fetch,
): Promise<SocketHandshakeAuth> {
  try {
    const response = await fetchTicket("/api/socket-ticket", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) return {};
    if (!response.ok) return invalidTicket;

    const parsed = socketHandshakeAuthSchema.safeParse(await response.json());
    return parsed.success && parsed.data.ticket ? parsed.data : invalidTicket;
  } catch {
    return invalidTicket;
  }
}
