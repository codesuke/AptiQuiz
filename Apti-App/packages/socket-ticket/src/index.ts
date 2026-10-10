import {
  ROOM_REGISTRATION_AUDIENCE,
  type RoomRegistration,
  roomRegistrationSchema,
  SOCKET_TICKET_AUDIENCE,
  type SocketTicketClaims,
  type SocketTicketSubject,
  socketTicketClaimsSchema,
} from "@aptiquiz/contracts";
import { errors, type JWTPayload, jwtVerify, SignJWT } from "jose";

export const SOCKET_TICKET_LIFETIME_MS = 60_000;

const SIGNING_ALGORITHM = "HS256";
const MILLISECONDS_PER_SECOND = 1_000;
const LIFETIME_SECONDS = SOCKET_TICKET_LIFETIME_MS / MILLISECONDS_PER_SECOND;

export type SocketTicketRejection = "expired" | "tampered" | "wrong_audience" | "malformed";

export type SocketTicketVerification =
  | { readonly ok: true; readonly claims: SocketTicketClaims }
  | { readonly ok: false; readonly reason: SocketTicketRejection };

export function issueSocketTicket(
  subject: SocketTicketSubject,
  secret: string,
  now: number,
): Promise<string> {
  const issuedAtSeconds = Math.floor(now / MILLISECONDS_PER_SECOND);

  return new SignJWT({
    role: subject.role,
    homeCollegeId: subject.homeCollegeId,
    emailVerified: subject.emailVerified,
  })
    .setProtectedHeader({ alg: SIGNING_ALGORITHM })
    .setSubject(subject.userId)
    .setAudience(SOCKET_TICKET_AUDIENCE)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(issuedAtSeconds + LIFETIME_SECONDS)
    .sign(encodeSecret(secret));
}

export async function verifySocketTicket(
  ticket: string,
  secret: string,
  now: number,
): Promise<SocketTicketVerification> {
  try {
    const { payload } = await jwtVerify(ticket, encodeSecret(secret), {
      algorithms: [SIGNING_ALGORITHM],
      audience: SOCKET_TICKET_AUDIENCE,
      currentDate: new Date(now),
      maxTokenAge: LIFETIME_SECONDS,
      requiredClaims: ["sub", "iat", "exp"],
    });
    return readClaims(payload);
  } catch (error) {
    return { ok: false, reason: classifyRejection(error) };
  }
}

export const ROOM_REGISTRATION_LIFETIME_MS = 60_000;
const ROOM_REGISTRATION_LIFETIME_SECONDS = ROOM_REGISTRATION_LIFETIME_MS / MILLISECONDS_PER_SECOND;

export type RoomRegistrationVerification =
  | { readonly ok: true; readonly registration: RoomRegistration }
  | { readonly ok: false; readonly reason: SocketTicketRejection };

/** Signs the web server's Room handoff so only a holder of the shared secret can register a Room. */
export function issueRoomRegistration(
  registration: RoomRegistration,
  secret: string,
  now: number,
): Promise<string> {
  const issuedAtSeconds = Math.floor(now / MILLISECONDS_PER_SECOND);

  return new SignJWT({ registration })
    .setProtectedHeader({ alg: SIGNING_ALGORITHM })
    .setSubject(registration.roomId)
    .setAudience(ROOM_REGISTRATION_AUDIENCE)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(issuedAtSeconds + ROOM_REGISTRATION_LIFETIME_SECONDS)
    .sign(encodeSecret(secret));
}

export async function verifyRoomRegistration(
  token: string,
  secret: string,
  now: number,
): Promise<RoomRegistrationVerification> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [SIGNING_ALGORITHM],
      audience: ROOM_REGISTRATION_AUDIENCE,
      currentDate: new Date(now),
      maxTokenAge: ROOM_REGISTRATION_LIFETIME_SECONDS,
      requiredClaims: ["sub", "iat", "exp"],
    });
    const parsed = roomRegistrationSchema.safeParse(payload.registration);
    return parsed.success && parsed.data.roomId === payload.sub
      ? { ok: true, registration: parsed.data }
      : { ok: false, reason: "malformed" };
  } catch (error) {
    return { ok: false, reason: classifyRejection(error) };
  }
}

function readClaims(payload: JWTPayload): SocketTicketVerification {
  const parsed = socketTicketClaimsSchema.safeParse({
    userId: payload.sub,
    role: payload.role,
    homeCollegeId: payload.homeCollegeId,
    emailVerified: payload.emailVerified,
    issuedAt: toMilliseconds(payload.iat),
    expiresAt: toMilliseconds(payload.exp),
    audience: payload.aud,
  });

  return parsed.success ? { ok: true, claims: parsed.data } : { ok: false, reason: "malformed" };
}

function classifyRejection(error: unknown): SocketTicketRejection {
  if (error instanceof errors.JWTExpired) {
    return "expired";
  }

  if (error instanceof errors.JWSSignatureVerificationFailed) {
    return "tampered";
  }

  if (error instanceof errors.JWTClaimValidationFailed && error.claim === "aud") {
    return "wrong_audience";
  }

  return "malformed";
}

function toMilliseconds(seconds: number | undefined): number | undefined {
  return seconds === undefined ? undefined : seconds * MILLISECONDS_PER_SECOND;
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}
