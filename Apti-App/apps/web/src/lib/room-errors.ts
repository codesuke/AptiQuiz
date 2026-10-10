import {
  displayNameSchema,
  MAX_ROOM_PARTICIPANTS,
  type RoomError,
  roomCodeSchema,
} from "@aptiquiz/contracts";

/** A Room error from the Game Server, or no acknowledgement before the client gave up. */
export type JoinFailure = RoomError | "no_response";

export type InputParse = { ok: true; value: string } | { ok: false; message: string };

const JOIN_FAILURE_MESSAGES: Record<JoinFailure, string> = {
  invalid_request: "Something went wrong with that request. Refresh the page and try again.",
  invalid_join_code: "Join Codes are 6 letters or numbers. Check the code and try again.",
  invalid_display_name: "Your display name must be 2 to 32 characters.",
  room_not_found: "We couldn't find a Room with that code. Check the code and try again.",
  room_full: `This Room is full (${MAX_ROOM_PARTICIPANTS} players).`,
  room_not_in_lobby: "This match has already started, so new players can't join.",
  not_room_host: "Only the Host of this Room can do that.",
  join_failed: "We couldn't add you to the Room just now. Try again.",
  start_failed: "We couldn't start the match just now. Try again.",
  no_response: "The game server didn't respond. Check your connection and try again.",
};

const TRANSIENT_JOIN_FAILURES: ReadonlySet<JoinFailure> = new Set(["join_failed", "no_response"]);

export function joinFailureMessage(failure: JoinFailure): string {
  return JOIN_FAILURE_MESSAGES[failure];
}

/** A transient failure may have joined on the server, so a retry must reuse its idempotency key. */
export function isTransientJoinFailure(failure: JoinFailure): boolean {
  return TRANSIENT_JOIN_FAILURES.has(failure);
}

export function parseJoinCodeInput(input: string): InputParse {
  const parsed = roomCodeSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, message: joinFailureMessage("invalid_join_code") };
}

export function parseDisplayNameInput(input: string): InputParse {
  const parsed = displayNameSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, message: joinFailureMessage("invalid_display_name") };
}
