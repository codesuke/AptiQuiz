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
