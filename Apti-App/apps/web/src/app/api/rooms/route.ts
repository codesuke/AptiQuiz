import { getSessionAccess } from "@/lib/auth";
import { database } from "@/lib/database";
import { registerRoom } from "@/lib/game-server-registration";
import { getHomeCollege } from "@/lib/home-college";
import { createHostedRoom } from "@/lib/rooms";
import { createRoomsPost } from "@/lib/rooms-handler";

export const POST = createRoomsPost({
  getSessionAccess,
  getHomeCollegeId: async (userId) => (await getHomeCollege(database, userId))?.id ?? null,
  createRoom: createHostedRoom,
  registerRoom,
});
