import { getSessionAccess } from "@/lib/auth";
import { database } from "@/lib/database";
import { getHomeCollege } from "@/lib/home-college";
import { createSocketTicketPost, readGameServerSecret } from "@/lib/socket-ticket-handler";

export const POST = createSocketTicketPost({
  getSessionAccess,
  getHomeCollegeId: async (userId) => (await getHomeCollege(database, userId))?.id ?? null,
  getSecret: readGameServerSecret,
  now: Date.now,
});
