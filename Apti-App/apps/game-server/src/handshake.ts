import {
  type ConnectionIdentity,
  type SocketHandshakeErrorCode,
  socketHandshakeAuthSchema,
} from "@aptiquiz/contracts";
import { verifySocketTicket } from "@aptiquiz/socket-ticket";

export type HandshakeResult =
  | { readonly ok: true; readonly identity: ConnectionIdentity }
  | { readonly ok: false; readonly error: SocketHandshakeErrorCode };

const GUEST: HandshakeResult = { ok: true, identity: { kind: "guest" } };

export async function identifyConnection(
  auth: unknown,
  secret: string,
  now: number,
): Promise<HandshakeResult> {
  const parsedAuth = socketHandshakeAuthSchema.safeParse(auth);

  if (!parsedAuth.success) {
    return { ok: false, error: "socket_ticket_invalid" };
  }

  const { ticket } = parsedAuth.data;

  if (ticket === undefined) {
    return GUEST;
  }

  const verification = await verifySocketTicket(ticket, secret, now);

  if (!verification.ok) {
    const error =
      verification.reason === "expired" ? "socket_ticket_expired" : "socket_ticket_invalid";
    return { ok: false, error };
  }

  const { userId, role, homeCollegeId, emailVerified } = verification.claims;
  return { ok: true, identity: { kind: "user", userId, role, homeCollegeId, emailVerified } };
}
