import {
  type CreateRoomRequest,
  type CreateRoomResponse,
  createRoomResponseSchema,
  type RoomError,
} from "@aptiquiz/contracts";
import type { CreateRoomError } from "./rooms-handler";

export type CreateRoomFailure = CreateRoomError | "network_error";
export type CreateRoomOutcome =
  | { ok: true; room: CreateRoomResponse }
  | { ok: false; error: CreateRoomFailure };

const createRoomErrorMessages: Record<CreateRoomFailure, string> = {
  unauthorized: "Your session ended. Sign in again to host a Room.",
  account_suspended: "This account is suspended and cannot host Rooms.",
  home_college_required: "Choose your Home College before you host a Room.",
  invalid_request: "Choose a Question Set, then try again.",
  question_set_not_found: "That Question Set is not available to you. Choose another one.",
  game_server_unavailable: "The Game Server did not accept the Room. Try again in a moment.",
  network_error: "The Room could not be created. Check your connection and try again.",
};

const roomErrorMessages: Record<RoomError, string> = {
  invalid_request: "The Game Server rejected the request. Reload the page and try again.",
  invalid_join_code: "This Join Code is not valid.",
  invalid_display_name: "That display name is not valid.",
  room_not_found:
    "The Game Server does not have this Room. It may have restarted — reload the page to reopen the Lobby.",
  room_full: "This Room is full.",
  room_not_in_lobby: "This Room has already left the Lobby.",
  not_room_host: "Only the Host of this Room can do that.",
  join_failed: "The join did not complete. Try again.",
  start_failed: "The match did not start. Try again.",
};

function isCreateRoomFailure(value: unknown): value is CreateRoomFailure {
  return typeof value === "string" && Object.hasOwn(createRoomErrorMessages, value);
}

function readCreateRoomFailure(body: unknown): CreateRoomFailure {
  const error = typeof body === "object" && body !== null && "error" in body ? body.error : null;
  return isCreateRoomFailure(error) ? error : "network_error";
}

export async function requestRoomCreation(
  request: CreateRoomRequest,
  fetchRoom: typeof fetch = fetch,
): Promise<CreateRoomOutcome> {
  try {
    const response = await fetchRoom("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      credentials: "same-origin",
      cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok) return { ok: false, error: readCreateRoomFailure(body) };
    const room = createRoomResponseSchema.safeParse(body);
    return room.success ? { ok: true, room: room.data } : { ok: false, error: "network_error" };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export function describeCreateRoomFailure(error: CreateRoomFailure): string {
  return createRoomErrorMessages[error];
}

export function describeRoomError(error: RoomError): string {
  return roomErrorMessages[error];
}

export function buildJoinLink(origin: string, joinCode: string): string {
  return new URL(`/join/${encodeURIComponent(joinCode)}`, origin).toString();
}

export function buildRoomInvite(collegeName: string, joinCode: string): string {
  return `Join my ${collegeName} AptiQuiz Room with code ${joinCode}.`;
}
