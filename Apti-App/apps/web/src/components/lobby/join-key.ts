import { type RoomJoin, roomJoinSchema } from "@aptiquiz/contracts";
import { isTransientJoinFailure, type JoinFailure } from "../../lib/room-errors";

export interface FailedJoin {
  readonly key: string;
  readonly failure: JoinFailure;
}

/**
 * Picks the idempotency key for the next join attempt. After a transient failure the
 * server may already hold the Participant, so the retry reuses the key.
 */
export function nextJoinKey(previous: FailedJoin | null, createKey: () => string): string {
  return previous !== null && isTransientJoinFailure(previous.failure) ? previous.key : createKey();
}

interface KeyRandomness {
  getRandomValues(array: Uint8Array): Uint8Array;
  randomUUID?(): string;
}

const UUID_BYTES = 16;
const VERSION_BYTE = 6;
const VARIANT_BYTE = 8;

/** `crypto.randomUUID` needs a secure context, so plain-HTTP LAN testing builds a v4 UUID by hand. */
export function createIdempotencyKey(randomness: KeyRandomness = globalThis.crypto): string {
  if (randomness.randomUUID) return randomness.randomUUID();

  const bytes = randomness.getRandomValues(new Uint8Array(UUID_BYTES));
  bytes[VERSION_BYTE] = ((bytes[VERSION_BYTE] ?? 0) & 0x0f) | 0x40;
  bytes[VARIANT_BYTE] = ((bytes[VARIANT_BYTE] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The subset of the Web Storage interface the join flow needs; `sessionStorage` satisfies it. */
export interface JoinStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORED_JOIN_PREFIX = "aptiquiz:join:";

function storedJoinKey(joinCode: string): string {
  return `${STORED_JOIN_PREFIX}${joinCode}`;
}

function parseStoredJoin(raw: string, joinCode: string): RoomJoin | null {
  try {
    const parsed = roomJoinSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.joinCode === joinCode ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the join attempt kept for this tab and Join Code. A refresh replays it with the same
 * idempotency key, so the server returns the same Participant instead of adding a Guest.
 * Storage can be blocked (private mode, sandboxed frames); that reads as nothing stored.
 */
export function readStoredJoin(storage: JoinStorage, joinCode: string): RoomJoin | null {
  try {
    const raw = storage.getItem(storedJoinKey(joinCode));
    return raw === null ? null : parseStoredJoin(raw, joinCode);
  } catch {
    return null;
  }
}

/** Stored before the request is sent: a refresh mid-request must reuse the same key. */
export function rememberJoin(storage: JoinStorage, attempt: RoomJoin): void {
  try {
    storage.setItem(storedJoinKey(attempt.joinCode), JSON.stringify(attempt));
  } catch {
    // Without storage the join still works; only refresh recovery is lost.
  }
}

export function forgetStoredJoin(storage: JoinStorage, joinCode: string): void {
  try {
    storage.removeItem(storedJoinKey(joinCode));
  } catch {
    // Nothing to forget when storage is unavailable.
  }
}

/** A definite refusal (e.g. room_not_found) makes the stored attempt useless; a transient one does not. */
export function settleStoredJoin(
  storage: JoinStorage,
  joinCode: string,
  failure: JoinFailure,
): void {
  if (!isTransientJoinFailure(failure)) forgetStoredJoin(storage, joinCode);
}
