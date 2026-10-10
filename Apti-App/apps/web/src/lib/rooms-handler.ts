import "server-only";
import {
  type CreateRoomRequest,
  type CreateRoomResponse,
  createRoomRequestSchema,
  type RoomRegistration,
} from "@aptiquiz/contracts";
import type { HostedRoom } from "@aptiquiz/database";
import type { RoomRegistrationOutcome } from "./game-server-registration";

export type RoomsAccess =
  | { kind: "guest" }
  | { kind: "suspended" }
  | { kind: "active"; user: { id: string } };

export type CreatedRoom =
  | { kind: "created"; room: HostedRoom }
  | { kind: "question_set_not_found" }
  | { kind: "question_set_empty" };

interface RoomsDependencies {
  getSessionAccess(headers: Headers): Promise<RoomsAccess>;
  getHomeCollegeId(userId: string): Promise<string | null>;
  createRoom(hostId: string, request: CreateRoomRequest, collegeId: string): Promise<CreatedRoom>;
  registerRoom(registration: RoomRegistration): Promise<RoomRegistrationOutcome>;
}

export type CreateRoomError =
  | "unauthorized"
  | "account_suspended"
  | "home_college_required"
  | "invalid_request"
  | "question_set_not_found"
  | "question_set_empty"
  | "game_server_unavailable";

const noStoreHeaders = { "cache-control": "no-store" };

function failure(error: CreateRoomError, status: number) {
  return Response.json({ error }, { status, headers: noStoreHeaders });
}

async function readCreateRoomRequest(request: Request): Promise<CreateRoomRequest | null> {
  try {
    const parsed = createRoomRequestSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createRoomsPost(dependencies: RoomsDependencies) {
  return async function POST(request: Request): Promise<Response> {
    const access = await dependencies.getSessionAccess(request.headers);
    if (access.kind === "guest") return failure("unauthorized", 401);
    if (access.kind === "suspended") return failure("account_suspended", 403);

    const hostId = access.user.id;
    const collegeId = await dependencies.getHomeCollegeId(hostId);
    if (!collegeId) return failure("home_college_required", 409);

    const body = await readCreateRoomRequest(request);
    if (!body) return failure("invalid_request", 400);

    const created = await dependencies.createRoom(hostId, body, collegeId);
    if (created.kind === "question_set_not_found") return failure("question_set_not_found", 404);
    if (created.kind === "question_set_empty") return failure("question_set_empty", 422);
    const { room } = created;

    // A retry with the same idempotency key returns the stored Room; registering it again
    // recovers from an earlier Game Server failure or restart.
    if (room.status === "LOBBY") {
      const registered = await dependencies.registerRoom(room.registration);
      if (!registered.ok) return failure("game_server_unavailable", 502);
    }

    const response: CreateRoomResponse = { roomId: room.roomId, joinCode: room.joinCode };
    return Response.json(response, { headers: noStoreHeaders });
  };
}
