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
  "GETTING_READY",
  "QUESTION_OPEN",
  "QUESTION_REVEAL",
  "LEADERBOARD",
  "FINALIZING_RESULTS",
  "FINISHED",
]);

export const lobbyParticipantSchema = z.object({
  participantId: z.string().min(1),
  displayName: displayNameSchema,
  isGuest: z.boolean(),
});

export const MAX_ROOM_PARTICIPANTS = 50;

/** Game Server timing values, shown to everyone before play. */
export const roundRulesSchema = z.object({
  roundDurationMs: z.number().int().positive(),
  /** Most one-way network delay subtracted from an Answer's elapsed time, for scoring only. */
  maxDelayCompensationMs: z.number().int().nonnegative(),
  /** Effective Response Times are floored to this step before scoring. */
  scoreBucketMs: z.number().int().positive(),
});

/** Correct Answers out of the Questions of one Topic; unanswered Questions stay in `total`. */
export const topicStrengthSchema = z.object({
  topic: z.string().min(1),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});

/** One Participant's saved result, shown to the whole Room after durable completion. */
export const finalResultSchema = z.object({
  participantId: z.string().min(1),
  displayName: displayNameSchema,
  rank: z.number().int().positive(),
  totalScore: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  /** Questions in the Room, answered or not: the accuracy denominator. */
  totalQuestions: z.number().int().positive(),
  /** Mean Effective Response Time of all accepted Answers in ms; null when there were none. */
  averageResponseMs: z.number().int().nonnegative().nullable(),
  topics: z.array(topicStrengthSchema),
});

export const lobbySnapshotSchema = z.object({
  roomId: roomIdSchema,
  joinCode: roomCodeSchema,
  phase: roomPhaseSchema,
  /** Present in Getting ready; clients derive a countdown from this server timestamp. */
  ready: z
    .object({
      questionIndex: z.number().int().nonnegative(),
      endsAt: timestampSchema,
      serverTime: timestampSchema,
    })
    .optional(),
  college: collegeSchema,
  questionSetTitle: z.string().min(1),
  questionCount: z.number().int().positive(),
  participants: z.array(lobbyParticipantSchema).max(MAX_ROOM_PARTICIPANTS),
  rules: roundRulesSchema,
  /** Saved results, best rank first. Present only once the Room is FINISHED and its results committed. */
  results: z.array(finalResultSchema).optional(),
});

/** A Question as Participants see it before the reveal: no correct option, no explanation. */
export const publicQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  topic: z.string().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  media: z.record(z.string(), z.unknown()).optional(),
});

const roundBaseSchema = z.object({
  roomId: roomIdSchema,
  questionIndex: z.number().int().nonnegative(),
  questionCount: z.number().int().positive(),
  startsAt: timestampSchema,
  endsAt: timestampSchema,
  /** Server time when this view was sent; the browser derives its clock offset from it. */
  serverTime: timestampSchema,
  /** Options in the order the server assigned to the receiving Participant for this Round. */
  question: publicQuestionSchema,
});

/** The receiver's accepted Answer; it never says whether the Answer is correct before the reveal. */
export const lockedAnswerSchema = z.object({
  questionIndex: z.number().int().nonnegative(),
  optionId: z.string().min(1),
  receivedAt: timestampSchema,
});

export const openRoundSchema = roundBaseSchema.extend({
  phase: z.literal("QUESTION_OPEN"),
  /** This Participant's accepted Answer, or null; always null for the Host. */
  answer: lockedAnswerSchema.nullable(),
});

/** Whether a Participant's Answer was correct and the points it earned in one Round. */
export const roundResultSchema = z.object({
  correct: z.boolean(),
  points: z.number().int().nonnegative(),
});

/** One Participant's result for a closed Round. */
export const roundScoreSchema = roundResultSchema.extend({
  participantId: z.string().min(1),
  displayName: displayNameSchema,
  answered: z.boolean(),
  /**
   * The bucketed Effective Response Time the server scored this Participant's accepted Answer
   * with, in milliseconds; null without an accepted Answer. Sent only in a revealed Round.
   */
  effectiveResponseMs: z.number().int().nonnegative().nullable().optional(),
});

/**
 * One Participant's place in the cumulative standings after a closed Round. Ranks are a total
 * order (1..n, no shared ranks). `movement` is previous Round rank minus current rank: positive
 * climbed, negative dropped, 0 unchanged, and null after the first Round (no previous rank).
 */
export const leaderboardEntrySchema = z.object({
  participantId: z.string().min(1),
  displayName: displayNameSchema,
  rank: z.number().int().positive(),
  totalScore: z.number().int().nonnegative(),
  movement: z.number().int().nullable(),
});

/** Sent only after the Round closes: the correct option and every Participant's Round points. */
export const revealedRoundSchema = roundBaseSchema.extend({
  phase: z.literal("QUESTION_REVEAL"),
  closedAt: timestampSchema,
  revealEndsAt: timestampSchema,
  /** In the receiver's own option id space. */
  correctOptionId: z.string().min(1),
  /** This Participant's accepted Answer, or null; always null for the Host. */
  answer: lockedAnswerSchema.nullable(),
  /** This Participant's own result, or null for the Host. */
  result: roundResultSchema.nullable(),
  /** Every joined Participant in join order; unanswered Participants have 0 points. */
  scores: z.array(roundScoreSchema),
  /** Cumulative standings of every joined Participant, best rank first; identical for all receivers. */
  leaderboard: z.array(leaderboardEntrySchema),
});

export const roundViewSchema = z.discriminatedUnion("phase", [
  openRoundSchema,
  revealedRoundSchema,
]);

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
  "round_not_revealed",
  "room_finished",
  "invalid_resume_token",
  "advance_failed",
  "advance_disabled",
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

export const roomResumeSchema = z.object({
  joinCode: z.string(),
  resumeToken: z.string(),
});

/** The Host moves a revealed Room to its next Question, or finishes it after the last one. */
export const roomAdvanceSchema = z.object({
  roomId: roomIdSchema,
  idempotencyKey: idempotencyKeySchema,
});

const roomFailureSchema = z.object({ ok: z.literal(false), error: roomErrorSchema });

export const roomHostResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    lobby: lobbySnapshotSchema,
    round: roundViewSchema.nullable(),
  }),
  roomFailureSchema,
]);

/** Opaque, high-entropy proof that reclaims one Participant of one Room after a reconnect. */
export const resumeTokenSchema = z.string().min(32).max(128);

export const roomJoinResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    participant: lobbyParticipantSchema,
    lobby: lobbySnapshotSchema,
    round: roundViewSchema.nullable(),
    /** Sent only to the joining browser; never broadcast. */
    resumeToken: resumeTokenSchema,
  }),
  roomFailureSchema,
]);

export const roomStartResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), lobby: lobbySnapshotSchema }),
  roomFailureSchema,
]);

export const roundAnswerSchema = z.object({
  roomId: roomIdSchema,
  questionIndex: z.number().int().nonnegative(),
  optionId: z.string().min(1).max(64),
  idempotencyKey: idempotencyKeySchema,
});

export const answerErrorSchema = z.enum([
  "invalid_request",
  "room_not_found",
  "not_participant",
  "round_not_open",
  "wrong_round",
  "invalid_option",
  "already_answered",
  "answer_too_late",
]);

export const roundAnswerResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), answer: lockedAnswerSchema }),
  z.object({ ok: z.literal(false), error: answerErrorSchema }),
]);

/** Server-initiated round-trip sample; the browser acknowledges at once. */
export const latencyPingSchema = z.object({ serverSentAt: timestampSchema });

export const roomAdvanceResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    lobby: lobbySnapshotSchema,
    /** The Host's view of the newly opened Round, or null when the Room finished. */
    round: roundViewSchema.nullable(),
  }),
  roomFailureSchema,
]);

export const roomResumeResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    participant: lobbyParticipantSchema,
    lobby: lobbySnapshotSchema,
    /** The current Round in this Participant's own option order, or null outside a Round. */
    round: roundViewSchema.nullable(),
    /** Points from revealed Rounds only, so an open Round never discloses correctness. */
    score: z.number().int().nonnegative(),
  }),
  roomFailureSchema,
]);

export type RoomQuestion = z.infer<typeof roomQuestionSchema>;
export type RoomRegistration = z.infer<typeof roomRegistrationSchema>;
export type RoomRegistrationResponse = z.infer<typeof roomRegistrationResponseSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;
export type RoomPhase = z.infer<typeof roomPhaseSchema>;
export type LobbyParticipant = z.infer<typeof lobbyParticipantSchema>;
export type TopicStrength = z.infer<typeof topicStrengthSchema>;
export type FinalResult = z.infer<typeof finalResultSchema>;
export type LobbySnapshot = z.infer<typeof lobbySnapshotSchema>;
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
export type OpenRound = z.infer<typeof openRoundSchema>;
export type RoundResult = z.infer<typeof roundResultSchema>;
export type RoundScore = z.infer<typeof roundScoreSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type RevealedRound = z.infer<typeof revealedRoundSchema>;
export type RoundView = z.infer<typeof roundViewSchema>;
export type RoundRules = z.infer<typeof roundRulesSchema>;
export type LockedAnswer = z.infer<typeof lockedAnswerSchema>;
export type RoundAnswer = z.infer<typeof roundAnswerSchema>;
export type AnswerError = z.infer<typeof answerErrorSchema>;
export type RoundAnswerResponse = z.infer<typeof roundAnswerResponseSchema>;
export type LatencyPing = z.infer<typeof latencyPingSchema>;
export type RoomError = z.infer<typeof roomErrorSchema>;
export type RoomHost = z.infer<typeof roomHostSchema>;
export type RoomJoin = z.infer<typeof roomJoinSchema>;
export type RoomStart = z.infer<typeof roomStartSchema>;
export type RoomHostResponse = z.infer<typeof roomHostResponseSchema>;
export type RoomJoinResponse = z.infer<typeof roomJoinResponseSchema>;
export type RoomStartResponse = z.infer<typeof roomStartResponseSchema>;
export type RoomResume = z.infer<typeof roomResumeSchema>;
export type RoomResumeResponse = z.infer<typeof roomResumeResponseSchema>;
export type RoomAdvance = z.infer<typeof roomAdvanceSchema>;
export type RoomAdvanceResponse = z.infer<typeof roomAdvanceResponseSchema>;

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
  "room:resume": (payload: RoomResume, acknowledge: (response: RoomResumeResponse) => void) => void;
  "room:advance": (
    payload: RoomAdvance,
    acknowledge: (response: RoomAdvanceResponse) => void,
  ) => void;
  "round:answer": (
    payload: RoundAnswer,
    acknowledge: (response: RoundAnswerResponse) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "server:ready": (payload: ServerReady) => void;
  "room:lobby": (payload: LobbySnapshot) => void;
  /** Sent separately to each Participant (own option order) and to the Host. */
  "round:state": (payload: RoundView) => void;
  "latency:ping": (payload: LatencyPing, acknowledge: () => void) => void;
}

export type InterServerEvents = Record<never, never>;

export interface SocketData {
  connectionId: string;
  identity: ConnectionIdentity;
}
