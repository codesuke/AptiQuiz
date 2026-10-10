import {
  type AnswerError,
  displayNameSchema,
  MAX_ROOM_PARTICIPANTS,
  type RoomError,
  roomCodeSchema,
} from "@aptiquiz/contracts";

/** A Room error from the Game Server, or no acknowledgement before the client gave up. */
export type JoinFailure = RoomError | "no_response";

/** An Answer refusal, or a lost or malformed acknowledgement that is safe to retry. */
export type AnswerFailure = AnswerError | "answer_failed" | "no_response";

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

const ANSWER_FAILURE_MESSAGES: Record<AnswerFailure, string> = {
  invalid_request: "That Answer could not be sent. Refresh the page and try again.",
  room_not_found: "This Room is no longer running.",
  not_participant: "Reconnecting you to the Room. Try again in a moment.",
  round_not_open: "This Question is closed.",
  wrong_round: "This Question has already moved on.",
  invalid_option: "That option is not part of this Question. Refresh the page.",
  already_answered: "You already answered this Question.",
  answer_too_late: "Time was up before your Answer arrived, so it does not count.",
  answer_failed: "Your Answer could not be confirmed. Try again.",
  no_response: "The game server didn't respond. Try again.",
};

const TRANSIENT_ANSWER_FAILURES: ReadonlySet<AnswerFailure> = new Set([
  "answer_failed",
  "no_response",
  "not_participant",
]);

export function answerFailureMessage(failure: AnswerFailure): string {
  return ANSWER_FAILURE_MESSAGES[failure];
}

/**
 * A retry is allowed and must reuse its key: the server may have accepted the Answer, or (for
 * `not_participant`) the socket had reconnected but its rejoin had not finished yet.
 */
export function isTransientAnswerFailure(failure: AnswerFailure): boolean {
  return TRANSIENT_ANSWER_FAILURES.has(failure);
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
