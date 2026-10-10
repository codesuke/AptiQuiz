import { createHash, createHmac } from "node:crypto";

/**
 * A Resume Token is a keyed hash of one Participant of one Room. Deriving it rather than
 * drawing it at random lets a join retried after a lost acknowledgement return the same token
 * without keeping the plaintext anywhere. The trade-off: anyone holding `GAME_SERVER_SECRET`
 * can mint a token for any Participant, so the secret stays server-only, as it already must
 * for Socket Tickets.
 */
export function deriveResumeToken(secret: string, roomId: string, participantId: string): string {
  return createHmac("sha256", secret)
    .update(`resume:${roomId}:${participantId}`)
    .digest("base64url");
}

/** The only form of a Resume Token the server keeps, in memory and in the database. */
export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
