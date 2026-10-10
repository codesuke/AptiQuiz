import "server-only";
import type { SocketTicketSubject } from "@aptiquiz/contracts";
import { issueSocketTicket } from "@aptiquiz/socket-ticket";
import { resolveRole } from "./roles";

type TicketUser = { id: string; email: string; emailVerified: boolean };
type TicketAccess =
  | { kind: "guest" }
  | { kind: "suspended" }
  | { kind: "active"; user: TicketUser };

interface SocketTicketDependencies {
  getSessionAccess(headers: Headers): Promise<TicketAccess>;
  getSecret(): string;
  now(): number;
}

const noStoreHeaders = { "cache-control": "no-store" };

export function readGameServerSecret() {
  const secret = process.env.GAME_SERVER_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("GAME_SERVER_SECRET must contain at least 32 characters");
  }
  return secret;
}

export function createSocketTicketPost(dependencies: SocketTicketDependencies) {
  return async function POST(request: Request): Promise<Response> {
    const access = await dependencies.getSessionAccess(request.headers);
    if (access.kind === "guest") {
      return Response.json({ error: "unauthorized" }, { status: 401, headers: noStoreHeaders });
    }
    if (access.kind === "suspended") {
      return Response.json(
        { error: "account_suspended" },
        { status: 403, headers: noStoreHeaders },
      );
    }

    const role = resolveRole({ user: access.user });
    if (role === "guest") throw new Error("Active User resolved as Guest");
    const subject: SocketTicketSubject = {
      userId: access.user.id,
      role,
      homeCollegeId: null,
      emailVerified: access.user.emailVerified,
    };
    const ticket = await issueSocketTicket(subject, dependencies.getSecret(), dependencies.now());
    return Response.json({ ticket }, { headers: noStoreHeaders });
  };
}
