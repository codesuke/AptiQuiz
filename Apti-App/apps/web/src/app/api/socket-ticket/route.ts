import { getSessionAccess } from "@/lib/auth";
import { createSocketTicketPost, readGameServerSecret } from "@/lib/socket-ticket-handler";

export const POST = createSocketTicketPost({
  getSessionAccess,
  getSecret: readGameServerSecret,
  now: Date.now,
});
