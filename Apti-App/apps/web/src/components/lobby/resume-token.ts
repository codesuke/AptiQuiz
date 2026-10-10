import { type RoomJoin, resumeTokenSchema } from "@aptiquiz/contracts";
import { isTransientJoinFailure, type JoinFailure } from "../../lib/room-errors";
import type { JoinStorage } from "./join-key";

const RESUME_TOKEN_PREFIX = "aptiquiz:resume:";

function resumeTokenKey(joinCode: string): string {
  return `${RESUME_TOKEN_PREFIX}${joinCode}`;
}

/**
 * Reads the Resume Token kept for this Join Code. Blocked storage or a malformed value reads
 * as nothing stored, so the caller falls back to the pending join attempt or the form.
 */
export function readResumeToken(storage: JoinStorage, joinCode: string): string | null {
  try {
    const parsed = resumeTokenSchema.safeParse(storage.getItem(resumeTokenKey(joinCode)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Kept after every successful join so a refresh or a closed tab can reclaim the Participant.
 * Returns whether the token was stored; without storage only this page's memory keeps it.
 */
export function rememberResumeToken(
  storage: JoinStorage,
  joinCode: string,
  token: string,
): boolean {
  try {
    storage.setItem(resumeTokenKey(joinCode), token);
    return true;
  } catch {
    return false;
  }
}

export function forgetResumeToken(storage: JoinStorage, joinCode: string): void {
  try {
    storage.removeItem(resumeTokenKey(joinCode));
  } catch {
    // Nothing to forget when storage is unavailable.
  }
}

export type ReconnectStep =
  | { readonly kind: "resume"; readonly resumeToken: string }
  | { readonly kind: "rejoin"; readonly attempt: RoomJoin }
  | { readonly kind: "none" };

/**
 * Picks how a new connection reclaims its Participant. A Resume Token wins; a pending join
 * attempt is replayed only when its acknowledgement (and so its token) never arrived.
 */
export function nextReconnectStep(
  resumeToken: string | null,
  pendingJoin: RoomJoin | null,
): ReconnectStep {
  if (resumeToken !== null) return { kind: "resume", resumeToken };
  if (pendingJoin !== null) return { kind: "rejoin", attempt: pendingJoin };
  return { kind: "none" };
}

export type ResumeFallback =
  | { readonly kind: "retry" }
  | { readonly kind: "rejoin"; readonly attempt: RoomJoin }
  | { readonly kind: "join_again" };

/**
 * After a refused resume: a lost or malformed acknowledgement keeps the token for a retry;
 * a definite refusal makes the token useless, so a pending join is replayed or the form shown.
 */
export function resumeFallback(failure: JoinFailure, pendingJoin: RoomJoin | null): ResumeFallback {
  if (isTransientJoinFailure(failure)) return { kind: "retry" };
  return pendingJoin === null ? { kind: "join_again" } : { kind: "rejoin", attempt: pendingJoin };
}
