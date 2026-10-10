import { z } from "zod";

const timestampSchema = z.number().int().nonnegative();

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, "Room codes contain six unambiguous letters or numbers.");

export const displayNameSchema = z.string().trim().min(2).max(32);

export const chooseHomeCollegeSchema = z.object({ collegeId: z.string().min(1) });

const COLLEGE_SEARCH_MAX_LENGTH = 80;
const COLLEGE_SEARCH_MAX_WORDS = 6;

export const collegeSearchQuerySchema = z
  .string()
  .trim()
  .max(COLLEGE_SEARCH_MAX_LENGTH)
  .refine((query) => query.split(/\s+/).filter(Boolean).length <= COLLEGE_SEARCH_MAX_WORDS);

export const collegeSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });
export type College = z.infer<typeof collegeSchema>;

export const collegeSearchResultSchema = z.object({ colleges: z.array(collegeSchema) });

export const timePingSchema = z.object({
  clientSentAt: timestampSchema,
});

export const timePingResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    clientSentAt: timestampSchema,
    serverReceivedAt: timestampSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const SOCKET_TICKET_AUDIENCE = "aptiquiz-game-server";

export const userRoleSchema = z.enum(["user", "admin"]);

export const socketTicketSubjectSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
  homeCollegeId: z.string().min(1).nullable(),
  emailVerified: z.boolean(),
});

export const socketTicketClaimsSchema = socketTicketSubjectSchema.extend({
  issuedAt: timestampSchema,
  expiresAt: timestampSchema,
  audience: z.literal(SOCKET_TICKET_AUDIENCE),
});

export const socketHandshakeAuthSchema = z.object({
  ticket: z.string().min(1).optional(),
});

export const socketHandshakeErrorCodeSchema = z.enum([
  "socket_ticket_expired",
  "socket_ticket_invalid",
]);

export const connectionIdentitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }),
  socketTicketSubjectSchema
    .pick({ userId: true, role: true, homeCollegeId: true, emailVerified: true })
    .extend({ kind: z.literal("user") }),
]);

export const serverReadySchema = z.object({
  connectionId: z.string().min(1),
  serverTime: timestampSchema,
  identity: connectionIdentitySchema,
});

export const idempotencyKeySchema = z.uuid();

const roomIdSchema = z.string().min(1).max(64);

export const roomQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  correctOptionId: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  media: z.record(z.string(), z.unknown()).optional(),
});

/** What the web server tells the Game Server about a newly created Room. */
export const roomRegistrationSchema = z.object({
  roomId: roomIdSchema,
  joinCode: roomCodeSchema,
  hostUserId: z.string().min(1),
  college: collegeSchema,
  questionSetTitle: z.string().min(1),
  questions: z.array(roomQuestionSchema).min(1),
});

export const ROOM_REGISTRATION_AUDIENCE = "aptiquiz-game-server-internal";
export const ROOM_REGISTRATION_PATH = "/internal/rooms";

export const roomRegistrationRequestSchema = z.object({ registration: z.string().min(1) });

export const roomRegistrationResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), roomId: roomIdSchema }),
  z.object({
    ok: z.literal(false),
    error: z.enum(["invalid_registration", "unauthorized", "join_code_taken"]),
  }),
]);

export const createRoomRequestSchema = z.object({
  questionSetId: z.string().min(1).max(64),
  idempotencyKey: idempotencyKeySchema,
});

export const createRoomResponseSchema = z.object({
  roomId: roomIdSchema,
  joinCode: roomCodeSchema,
});

export const roomPhaseSchema = z.enum([
  "LOBBY",
  "QUESTION_OPEN",
  "QUESTION_REVEAL",
  "LEADERBOARD",
  "FINISHED",
]);

export const lobbyParticipantSchema = z.object({
  participantId: z.string().min(1),
  displayName: displayNameSchema,
  isGuest: z.boolean(),
});

export const MAX_ROOM_PARTICIPANTS = 50;

export const lobbySnapshotSchema = z.object({
  roomId: roomIdSchema,
  joinCode: roomCodeSchema,
  phase: roomPhaseSchema,
  college: collegeSchema,
  questionSetTitle: z.string().min(1),
  questionCount: z.number().int().positive(),
  participants: z.array(lobbyParticipantSchema).max(MAX_ROOM_PARTICIPANTS),
});

export const roomErrorSchema = z.enum([
  "invalid_request",
  "invalid_join_code",
  "invalid_display_name",
  "room_not_found",
  "room_full",
  "room_not_in_lobby",
  "not_room_host",
  "join_failed",
  "start_failed",
]);

export const roomHostSchema = z.object({ roomId: roomIdSchema });

export const roomJoinSchema = z.object({
  joinCode: z.string(),
  displayName: z.string(),
  idempotencyKey: idempotencyKeySchema,
});

export const roomStartSchema = z.object({
  roomId: roomIdSchema,
  idempotencyKey: idempotencyKeySchema,
});

const roomFailureSchema = z.object({ ok: z.literal(false), error: roomErrorSchema });

export const roomHostResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), lobby: lobbySnapshotSchema }),
  roomFailureSchema,
]);

export const roomJoinResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    participant: lobbyParticipantSchema,
    lobby: lobbySnapshotSchema,
  }),
  roomFailureSchema,
]);

export const roomStartResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), lobby: lobbySnapshotSchema }),
  roomFailureSchema,
]);

export type RoomQuestion = z.infer<typeof roomQuestionSchema>;
export type RoomRegistration = z.infer<typeof roomRegistrationSchema>;
export type RoomRegistrationResponse = z.infer<typeof roomRegistrationResponseSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;
export type RoomPhase = z.infer<typeof roomPhaseSchema>;
export type LobbyParticipant = z.infer<typeof lobbyParticipantSchema>;
export type LobbySnapshot = z.infer<typeof lobbySnapshotSchema>;
export type RoomError = z.infer<typeof roomErrorSchema>;
export type RoomHost = z.infer<typeof roomHostSchema>;
export type RoomJoin = z.infer<typeof roomJoinSchema>;
export type RoomStart = z.infer<typeof roomStartSchema>;
export type RoomHostResponse = z.infer<typeof roomHostResponseSchema>;
export type RoomJoinResponse = z.infer<typeof roomJoinResponseSchema>;
export type RoomStartResponse = z.infer<typeof roomStartResponseSchema>;

export type TimePing = z.infer<typeof timePingSchema>;
export type TimePingResponse = z.infer<typeof timePingResponseSchema>;
export type ServerReady = z.infer<typeof serverReadySchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type SocketTicketSubject = z.infer<typeof socketTicketSubjectSchema>;
export type SocketTicketClaims = z.infer<typeof socketTicketClaimsSchema>;
export type SocketHandshakeAuth = z.infer<typeof socketHandshakeAuthSchema>;
export type SocketHandshakeErrorCode = z.infer<typeof socketHandshakeErrorCodeSchema>;
export type ConnectionIdentity = z.infer<typeof connectionIdentitySchema>;

export interface ClientToServerEvents {
  "time:ping": (payload: TimePing, acknowledge: (response: TimePingResponse) => void) => void;
  "room:host": (payload: RoomHost, acknowledge: (response: RoomHostResponse) => void) => void;
  "room:join": (payload: RoomJoin, acknowledge: (response: RoomJoinResponse) => void) => void;
  "room:start": (payload: RoomStart, acknowledge: (response: RoomStartResponse) => void) => void;
}

export interface ServerToClientEvents {
  "server:ready": (payload: ServerReady) => void;
  "room:lobby": (payload: LobbySnapshot) => void;
}

export type InterServerEvents = Record<never, never>;

export interface SocketData {
  connectionId: string;
  identity: ConnectionIdentity;
}
