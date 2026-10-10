import { createHash, randomUUID } from "node:crypto";
import {
  type AnswerError,
  type ConnectionIdentity,
  type FinalResult,
  type LeaderboardEntry,
  type LobbyParticipant,
  type LobbySnapshot,
  type LockedAnswer,
  MAX_ROOM_PARTICIPANTS,
  type PublicQuestion,
  type RoomError,
  type RoomQuestion,
  type RoomRegistration,
  type RoundResult,
  type RoundRules,
  type RoundScore,
  type RoundView,
} from "@aptiquiz/contracts";
import {
  createGameState,
  effectiveResponseTime,
  type GameCommand,
  type GameState,
  isAnswerOnTime,
  orderOptions,
  rankStandings,
  type Standing,
  scoreAnswer,
  summarizeMatch,
  type TimingPolicy,
  transitionGame,
} from "@aptiquiz/game-engine";
import type { Logger } from "pino";
import { deriveResumeToken, hashResumeToken } from "./resume-token.js";
import type { CommittedMatchResult, CompleteRoomInput, RoomStore } from "./room-store.js";
import type { CancelScheduled, Schedule } from "./scheduler.js";

type RoomFailure = { readonly ok: false; readonly error: RoomError };

export type RegistrationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: "join_code_taken" };

export type HostResult =
  | { readonly ok: true; readonly lobby: LobbySnapshot; readonly round: RoundView | null }
  | RoomFailure;

export type JoinResult =
  | {
      readonly ok: true;
      readonly participant: LobbyParticipant;
      readonly lobby: LobbySnapshot;
      readonly round: RoundView | null;
      /** Sent only in the joining socket's acknowledgement; never broadcast. */
      readonly resumeToken: string;
      readonly rosterChanged: boolean;
    }
  | RoomFailure;

export type ResumeResult =
  | {
      readonly ok: true;
      readonly participant: LobbyParticipant;
      readonly lobby: LobbySnapshot;
      readonly round: RoundView | null;
      /** Points from revealed Rounds only. */
      readonly score: number;
    }
  | RoomFailure;

/** Each receiver's view of a Round; Participants get their own option order and ids. */
export interface RoundDelivery {
  readonly host: RoundView;
  readonly participants: readonly ParticipantRound[];
}

export interface ParticipantRound {
  readonly participantId: string;
  readonly round: RoundView;
}

/** What every member of a Room learns when its Round closes. */
export interface RoundClosure {
  readonly lobby: LobbySnapshot;
  readonly delivery: RoundDelivery;
}

export type RoundClosedListener = (closure: RoundClosure) => void;

/** `delivery` is null when a retried start repeats the first result without a transition. */
export type StartResult =
  | {
      readonly ok: true;
      readonly lobby: LobbySnapshot;
      readonly delivery: RoundDelivery | null;
      readonly started: boolean;
    }
  | RoomFailure;

/** What a phase transition publishes; `delivery` is present only when a Question opens. */
export interface AdvancePublication {
  readonly lobby: LobbySnapshot;
  readonly delivery: RoundDelivery | null;
}

/**
 * `round` is the Host's view of the newly opened Round, or null once the Room finished.
 * `publication` is null when a transition cannot publish a new phase.
 */
export type AdvanceResult =
  | {
      readonly ok: true;
      readonly lobby: LobbySnapshot;
      readonly round: RoundView | null;
      readonly publication: AdvancePublication | null;
    }
  | RoomFailure;

/** An Answer whose payload passed the public contract schema, stamped at server receipt. */
export interface AnswerSubmission {
  readonly roomId: string;
  /** The Participant this socket joined the Room as, or null when it never joined it. */
  readonly participantId: string | null;
  readonly questionIndex: number;
  /** The option id in this Participant's opaque id space. */
  readonly optionId: string;
  readonly idempotencyKey: string;
  readonly receivedAt: number;
  /** Median of the answering socket's latency samples, or null without a sample. */
  readonly medianRoundTripMs: number | null;
}

export type AnswerResult =
  | { readonly ok: true; readonly answer: LockedAnswer }
  | { readonly ok: false; readonly error: AnswerError };

/** A scored Answer. Correctness and points stay on the server until the reveal. */
export interface RecordedAnswer {
  readonly participantId: string;
  readonly questionIndex: number;
  readonly authoredOptionId: string;
  /** The option id the Participant saw and sent. */
  readonly optionId: string;
  readonly receivedAt: number;
  readonly effectiveResponseMs: number;
  readonly correct: boolean;
  readonly points: number;
}

/** A resume whose Join Code and Resume Token already passed the public contract schemas. */
export interface ValidResumeRequest {
  readonly joinCode: string;
  readonly resumeToken: string;
}

/** A joined Participant a Resume Token reclaims, and the User who alone may reclaim it. */
interface ResumableParticipant {
  readonly identityKey: string;
  /** null for a Guest, whom any holder of the token may reclaim. */
  readonly userId: string | null;
}

/** A join whose code and display name already passed the public contract schemas. */
export interface ValidJoinRequest {
  readonly joinCode: string;
  readonly displayName: string;
  readonly idempotencyKey: string;
}

interface StartRecord {
  readonly idempotencyKey: string;
}

interface LiveRoom {
  readonly registration: RoomRegistration;
  readonly rules: RoundRules;
  /** Random per Room so clients cannot predict another Participant's option order. */
  readonly optionSalt: string;
  game: GameState;
  start: StartRecord | null;
  /** Joined Participants keyed by identity, in join order. */
  readonly participants: Map<string, LobbyParticipant>;
  /** Server time each Participant joined the Lobby, keyed by Participant id. */
  readonly joinedAt: Map<string, number>;
  /** Reserved slots whose persistence is still in flight, keyed by identity. */
  readonly pendingJoins: Map<string, Promise<JoinResult>>;
  /**
   * Accepted Answers keyed by `answerSlot`: one per Participant and Question, so each Round
   * starts clean and earlier Rounds keep their Answers.
   */
  readonly answers: Map<string, RecordedAnswer>;
  /** Accepted Answers keyed by `answerReceipt`, so a retried key repeats its result. */
  readonly answerReceipts: Map<string, RecordedAnswer>;
  /** Joined Participants keyed by the hash of their Resume Token; never the token itself. */
  readonly resumable: Map<string, ResumableParticipant>;
  /** Live sockets of each joined Participant, keyed by Participant id. */
  readonly connections: Map<string, Set<string>>;
  /** Participants who lost their last socket during an open Round, keyed by Participant id. */
  readonly reconnecting: Map<string, ReconnectGrace>;
  /** Cancels the open Round's deadline timer; null when no timer is pending. */
  cancelDeadline: CancelScheduled | null;
  /** The in-flight result commit; it never rejects. Null when idle. */
  completion: Promise<boolean> | null;
  /** The committed results, best rank first; null until final completion. */
  results: FinalResult[] | null;
}

/**
 * A dropped Participant still counts as connected for early closure of one Round until `until`,
 * so a browser refresh does not close the Question for everyone else.
 */
interface ReconnectGrace {
  readonly questionIndex: number;
  readonly until: number;
  /** Cancels the re-check scheduled for `until`. */
  readonly cancel: CancelScheduled;
}

/** The game state and Questions a Round view is built from. */
interface RoundSource {
  readonly registration: RoomRegistration;
  readonly optionSalt: string;
  readonly game: GameState;
}

/** A Round that is open or revealed; `closedAt` is null while it is open. */
interface ActiveRound {
  readonly roomId: string;
  readonly questionIndex: number;
  readonly questionCount: number;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly closedAt: number | null;
  readonly question: RoomQuestion;
}

const UNANSWERED_RESULT: RoundResult = { correct: false, points: 0 };

type RoundReceiver =
  | { readonly kind: "host" }
  | { readonly kind: "participant"; readonly participantId: string };

const HOST_RECEIVER: RoundReceiver = { kind: "host" };

export interface RoomRegistryDependencies {
  readonly store: RoomStore;
  readonly logger: Logger;
  readonly rules: RoundRules;
  readonly now: () => number;
  /** Runs Round deadlines against the same server clock as `now`. */
  readonly schedule: Schedule;
  /** Keys every Resume Token; the Game Server secret. */
  readonly resumeSecret: string;
  /** How long a dropped Participant still counts as connected for early Round closure. */
  readonly reconnectGraceMs: number;
}

export interface RoomRegistry {
  register(registration: RoomRegistration): RegistrationResult;
  hostLobby(roomId: string, identity: ConnectionIdentity): HostResult;
  join(request: ValidJoinRequest, identity: ConnectionIdentity): Promise<JoinResult>;
  /** Reclaims a joined Participant without changing the Room; repeating it changes nothing. */
  resume(request: ValidResumeRequest, identity: ConnectionIdentity): ResumeResult;
  start(roomId: string, idempotencyKey: string, identity: ConnectionIdentity): StartResult;
  answer(submission: AnswerSubmission): AnswerResult;
  /** Scored Answers for one Question, for the reveal; never sent to clients before it. */
  answersFor(roomId: string, questionIndex: number): readonly RecordedAnswer[];
  /** Records a live socket of a joined Participant. */
  connect(roomId: string, participantId: string, connectionId: string): void;
  /**
   * Forgets a socket. A Participant left with no socket still counts as connected for the open
   * Round's early closure until the reconnect grace ends; then the Round may close.
   */
  disconnect(roomId: string, participantId: string, connectionId: string): void;
  /** Closes the open Round early once every connected Participant has an accepted Answer. */
  closeIfAllAnswered(roomId: string): void;
  /** Tells `listener` about each Round closure, whatever caused it; returns an unsubscribe. */
  onRoundClosed(listener: RoundClosedListener): () => void;
  onReadyOpened(listener: (publication: AdvancePublication) => void): () => void;
  onAutoAdvance(listener: (publication: AdvancePublication) => void): () => void;
  /** Cancels every pending deadline and reconnect grace timer. */
  dispose(): void;
}

const ROOM_NOT_FOUND: RoomFailure = { ok: false, error: "room_not_found" };
const NOT_ROOM_HOST: RoomFailure = { ok: false, error: "not_room_host" };
const ROOM_NOT_IN_LOBBY: RoomFailure = { ok: false, error: "room_not_in_lobby" };
const ROOM_FULL: RoomFailure = { ok: false, error: "room_full" };
const JOIN_FAILED: RoomFailure = { ok: false, error: "join_failed" };
const START_FAILED: RoomFailure = { ok: false, error: "start_failed" };
const ADVANCE_FAILED: RoomFailure = { ok: false, error: "advance_failed" };
const READY_DURATION_MS = 3_000;
const REVEAL_DURATION_MS = 6_000;
const FINALIZATION_RETRY_MS = 2_000;
const INVALID_RESUME_TOKEN: RoomFailure = { ok: false, error: "invalid_resume_token" };

type AnswerFailure = Extract<AnswerResult, { ok: false }>;

const ANSWER_ROOM_NOT_FOUND: AnswerFailure = { ok: false, error: "room_not_found" };
const NOT_PARTICIPANT: AnswerFailure = { ok: false, error: "not_participant" };
const ROUND_NOT_OPEN: AnswerFailure = { ok: false, error: "round_not_open" };
const WRONG_ROUND: AnswerFailure = { ok: false, error: "wrong_round" };
const ANSWER_TOO_LATE: AnswerFailure = { ok: false, error: "answer_too_late" };
const ALREADY_ANSWERED: AnswerFailure = { ok: false, error: "already_answered" };
const INVALID_OPTION: AnswerFailure = { ok: false, error: "invalid_option" };

export function createRoomRegistry(dependencies: RoomRegistryDependencies): RoomRegistry {
  const { store, logger, rules, now, schedule, resumeSecret, reconnectGraceMs } = dependencies;
  const timing: TimingPolicy = {
    durationMs: rules.roundDurationMs,
    maxCompensationMs: rules.maxDelayCompensationMs,
    bucketMs: rules.scoreBucketMs,
  };
  const rooms = new Map<string, LiveRoom>();
  const roomIdsByJoinCode = new Map<string, string>();
  const closedListeners = new Set<RoundClosedListener>();
  const readyListeners = new Set<(publication: AdvancePublication) => void>();
  const advanceListeners = new Set<(publication: AdvancePublication) => void>();

  function register(registration: RoomRegistration): RegistrationResult {
    if (rooms.has(registration.roomId)) {
      return { ok: true };
    }

    if (roomIdsByJoinCode.has(registration.joinCode)) {
      return { ok: false, error: "join_code_taken" };
    }

    rooms.set(registration.roomId, {
      registration,
      rules,
      optionSalt: randomUUID(),
      game: createGameState(registration.roomId, registration.questions.length),
      start: null,
      participants: new Map(),
      joinedAt: new Map(),
      pendingJoins: new Map(),
      resumable: new Map(),
      answers: new Map(),
      answerReceipts: new Map(),
      connections: new Map(),
      reconnecting: new Map(),
      cancelDeadline: null,
      completion: null,
      results: null,
    });
    roomIdsByJoinCode.set(registration.joinCode, registration.roomId);
    return { ok: true };
  }

  function hostLobby(roomId: string, identity: ConnectionIdentity): HostResult {
    const room = rooms.get(roomId);

    if (room === undefined) {
      return ROOM_NOT_FOUND;
    }

    if (!isRoomHost(room, identity)) {
      return NOT_ROOM_HOST;
    }

    return { ok: true, lobby: toLobby(room, now()), round: currentRoundView(room, HOST_RECEIVER) };
  }

  function currentRoundView(room: LiveRoom, receiver: RoundReceiver): RoundView | null {
    const round = findActiveRound(room);
    return round === null ? null : viewRound({ room, round }, receiver, now());
  }

  function findRoomByJoinCode(joinCode: string): LiveRoom | undefined {
    const roomId = roomIdsByJoinCode.get(joinCode);
    return roomId === undefined ? undefined : rooms.get(roomId);
  }

  function resumeTokenFor(room: LiveRoom, participantId: string): string {
    return deriveResumeToken(resumeSecret, room.registration.roomId, participantId);
  }

  function join(request: ValidJoinRequest, identity: ConnectionIdentity): Promise<JoinResult> {
    const room = findRoomByJoinCode(request.joinCode);

    if (room === undefined) {
      return Promise.resolve(ROOM_NOT_FOUND);
    }

    const identityKey = participantIdentityKey(identity, request.idempotencyKey);
    const joined = room.participants.get(identityKey);

    if (joined !== undefined) {
      return Promise.resolve({
        ok: true,
        participant: joined,
        lobby: toLobby(room, now()),
        round: currentRoundView(room, participantReceiver(joined)),
        resumeToken: resumeTokenFor(room, joined.participantId),
        rosterChanged: false,
      });
    }

    const pending = room.pendingJoins.get(identityKey);

    if (pending !== undefined) {
      return pending.then(asRetry);
    }

    if (room.game.phase !== "LOBBY") {
      return Promise.resolve(ROOM_NOT_IN_LOBBY);
    }

    if (occupiedSlots(room) >= MAX_ROOM_PARTICIPANTS) {
      return Promise.resolve(ROOM_FULL);
    }

    const joining = recordJoin(room, identityKey, request, identity);
    room.pendingJoins.set(identityKey, joining);
    return joining;
  }

  async function recordJoin(
    room: LiveRoom,
    identityKey: string,
    request: ValidJoinRequest,
    identity: ConnectionIdentity,
  ): Promise<JoinResult> {
    const userId = identity.kind === "user" ? identity.userId : null;
    const chosenId = randomUUID();

    try {
      // A retry or race may return an earlier Participant; its token is derived from that id.
      const { participantId } = await store.recordParticipant({
        id: chosenId,
        roomId: room.registration.roomId,
        collegeId: participantCollegeId(room, identity),
        userId,
        displayName: request.displayName,
        idempotencyKey: request.idempotencyKey,
        resumeTokenHash: hashResumeToken(resumeTokenFor(room, chosenId)),
      });

      // The Host may start while the write is in flight. The stored row stays, but the
      // Participant never joins the live roster of a Room that has left the Lobby.
      if (room.game.phase !== "LOBBY") {
        return ROOM_NOT_IN_LOBBY;
      }

      const participant: LobbyParticipant = {
        participantId,
        displayName: request.displayName,
        isGuest: identity.kind === "guest",
      };
      const resumeToken = resumeTokenFor(room, participantId);
      room.participants.set(identityKey, participant);
      room.joinedAt.set(participantId, now());
      room.resumable.set(hashResumeToken(resumeToken), { identityKey, userId });
      return {
        ok: true,
        participant,
        lobby: toLobby(room, now()),
        round: null,
        resumeToken,
        rosterChanged: true,
      };
    } catch (error) {
      logger.error(
        { roomId: room.registration.roomId, err: error },
        "failed to record participant",
      );
      return JOIN_FAILED;
    } finally {
      room.pendingJoins.delete(identityKey);
    }
  }

  function resume(request: ValidResumeRequest, identity: ConnectionIdentity): ResumeResult {
    const room = findRoomByJoinCode(request.joinCode);

    if (room === undefined) {
      return ROOM_NOT_FOUND;
    }

    const resumable = room.resumable.get(hashResumeToken(request.resumeToken));
    const participant =
      resumable !== undefined && mayReclaim(resumable, identity)
        ? room.participants.get(resumable.identityKey)
        : undefined;

    if (participant === undefined) {
      return INVALID_RESUME_TOKEN;
    }

    return {
      ok: true,
      participant,
      lobby: toLobby(room, now()),
      round: currentRoundView(room, participantReceiver(participant)),
      score: revealedScoreOf(room, participant.participantId),
    };
  }

  function start(
    roomId: string,
    idempotencyKey: string,
    identity: ConnectionIdentity,
  ): StartResult {
    const room = rooms.get(roomId);

    if (room === undefined) {
      return ROOM_NOT_FOUND;
    }

    if (!isRoomHost(room, identity)) {
      return NOT_ROOM_HOST;
    }

    if (room.start !== null) {
      return room.start.idempotencyKey === idempotencyKey
        ? { ok: true, lobby: toLobby(room, now()), delivery: null, started: false }
        : ROOM_NOT_IN_LOBBY;
    }

    return startFromLobby(room, idempotencyKey);
  }

  function startFromLobby(room: LiveRoom, idempotencyKey: string): StartResult {
    if (room.game.phase !== "LOBBY") {
      return ROOM_NOT_IN_LOBBY;
    }

    const serverTime = now();
    const started = tryTransition(
      room.game,
      { type: "START", durationMs: rules.roundDurationMs, readyDurationMs: READY_DURATION_MS },
      serverTime,
    );
    if (started?.phase !== "GETTING_READY" || started.readyEndsAt === null) {
      return START_FAILED;
    }
    room.game = started;
    scheduleReady(room, started.readyEndsAt);
    const lobby = toLobby(room, serverTime);
    room.start = { idempotencyKey };
    return { ok: true, lobby, delivery: null, started: true };
  }

  function scheduleReady(room: LiveRoom, endsAt: number): void {
    room.cancelDeadline = schedule(endsAt, () => {
      room.cancelDeadline = null;
      if (room.game.phase !== "GETTING_READY" || room.game.readyEndsAt !== endsAt) return;
      if (now() < endsAt) {
        scheduleReady(room, endsAt);
        return;
      }
      const delivery = openRoundAt(
        room,
        transitionGame(
          room.game,
          { type: "OPEN_READY_QUESTION", durationMs: rules.roundDurationMs },
          now(),
        ).state,
        now(),
      );
      if (delivery === null) return;
      const publication = { lobby: toLobby(room, now()), delivery };
      for (const listener of readyListeners) listener(publication);
    });
  }

  /** Only a revealed Round advances, so a repeated timer cannot skip a Question. */
  function advanceAfterReveal(room: LiveRoom): AdvanceResult {
    if (room.game.phase === "FINISHED") {
      return ADVANCE_FAILED;
    }

    if (room.game.phase !== "QUESTION_REVEAL") {
      return ADVANCE_FAILED;
    }

    const serverTime = now();
    const next = tryTransition(
      room.game,
      { type: "ADVANCE", durationMs: rules.roundDurationMs, readyDurationMs: READY_DURATION_MS },
      serverTime,
    );

    if (next === null) {
      return ADVANCE_FAILED;
    }

    if (next.phase === "FINALIZING_RESULTS") {
      room.game = next;
      return recordAdvance(room, null);
    }

    if (next.phase === "GETTING_READY" && next.readyEndsAt !== null) {
      room.game = next;
      scheduleReady(room, next.readyEndsAt);
      return recordAdvance(room, null);
    }

    const delivery = openRoundAt(room, next, serverTime);
    return delivery === null ? ADVANCE_FAILED : recordAdvance(room, delivery);
  }

  /** Save once at a time and retry a failed transaction at a fixed, bounded frequency. */
  async function finalizeResults(room: LiveRoom): Promise<void> {
    if (room.game.phase !== "FINALIZING_RESULTS" || room.completion !== null) return;
    const commit = commitFinalResults(room, now());
    room.completion = commit;
    const committed = await commit;
    room.completion = null;

    if (!committed) {
      scheduleFinalizationRetry(room, now() + FINALIZATION_RETRY_MS);
      return;
    }

    room.game = transitionGame(room.game, { type: "COMPLETE" }, now()).state;
    const result = recordAdvance(room, null);
    if (result.ok && result.publication !== null) {
      for (const listener of advanceListeners) listener(result.publication);
    }
  }

  function scheduleFinalizationRetry(room: LiveRoom, at: number): void {
    room.cancelDeadline = schedule(at, () => {
      if (room.game.phase !== "FINALIZING_RESULTS") return;
      if (now() < at) {
        scheduleFinalizationRetry(room, at);
        return;
      }
      room.cancelDeadline = null;
      void finalizeResults(room).catch((error: unknown) => {
        logger.error({ roomId: room.registration.roomId, err: error }, "finalization retry failed");
        scheduleFinalizationRetry(room, now() + FINALIZATION_RETRY_MS);
      });
    });
  }

  async function commitFinalResults(room: LiveRoom, serverTime: number): Promise<boolean> {
    try {
      const committed = await store.completeRoom(finalResults(room, serverTime));
      room.results = toFinalResults(room, committed);
      return true;
    } catch (error) {
      logger.error(
        { roomId: room.registration.roomId, err: error },
        "failed to commit room results",
      );
      return false;
    }
  }

  /** A phase update may open a Question, or only publish a new Lobby phase. */
  function recordAdvance(room: LiveRoom, delivery: RoundDelivery | null): AdvanceResult {
    const lobby = toLobby(room, now());
    return { ok: true, lobby, round: delivery?.host ?? null, publication: { lobby, delivery } };
  }

  /**
   * The one path that opens every Round, the first and each later one, so deadlines, early
   * closure, and Answers behave the same for all of them. Returns null when `opened` has no
   * Question to show, leaving the Room unchanged.
   */
  function openRoundAt(
    room: LiveRoom,
    opened: GameState,
    serverTime: number,
  ): RoundDelivery | null {
    const round = findActiveRound({ ...room, game: opened });

    if (round === null) {
      return null;
    }

    room.game = opened;
    scheduleDeadline(room, round);
    return deliverRound(room, round, serverTime);
  }

  /** The timer never depends on Answers; it only closes the Round it was scheduled for. */
  function scheduleDeadline(room: LiveRoom, round: ActiveRound, atServerTime = round.endsAt): void {
    room.cancelDeadline = schedule(atServerTime, () => {
      room.cancelDeadline = null;
      closeAtDeadline(room, round.questionIndex);
    });
  }

  function closeAtDeadline(room: LiveRoom, questionIndex: number): void {
    const round = findOpenRound(room);

    if (round === null || round.questionIndex !== questionIndex) {
      return;
    }

    // An Answer received at `endsAt` is still on time, so a timer that fires early or exactly
    // at the deadline waits for the first late millisecond.
    if (isAnswerOnTime(round, now())) {
      scheduleDeadline(room, round, round.endsAt + 1);
      return;
    }

    closeRound(room);
  }

  /** The phase check makes closure idempotent: racing timers and Answers close once. */
  function closeRound(room: LiveRoom): void {
    if (room.game.phase !== "QUESTION_OPEN") {
      return;
    }

    const closedAt = now();
    room.game = transitionGame(room.game, { type: "CLOSE_QUESTION" }, closedAt).state;
    room.cancelDeadline?.();
    room.cancelDeadline = null;
    scheduleReveal(room, closedAt + REVEAL_DURATION_MS);
    const round = findActiveRound(room);

    if (round === null) {
      throw new Error(`Closed Round of Room ${room.registration.roomId} has no Question`);
    }

    const closure: RoundClosure = {
      lobby: toLobby(room, now()),
      delivery: deliverRound(room, round, closedAt),
    };

    for (const listener of closedListeners) {
      listener(closure);
    }
  }

  function scheduleReveal(room: LiveRoom, endsAt: number): void {
    const questionIndex = room.game.questionIndex;
    const closedAt = room.game.roundClosedAt;
    room.cancelDeadline = schedule(endsAt, () => {
      if (
        room.game.phase !== "QUESTION_REVEAL" ||
        room.game.questionIndex !== questionIndex ||
        room.game.roundClosedAt !== closedAt ||
        room.completion !== null
      )
        return;
      room.cancelDeadline = null;
      if (now() < endsAt) {
        scheduleReveal(room, endsAt);
        return;
      }
      if (questionIndex === null) return;
      try {
        const result = advanceAfterReveal(room);
        if (result.ok && result.publication !== null) {
          for (const listener of advanceListeners) listener(result.publication);
        }
        if (result.ok && result.lobby.phase === "FINALIZING_RESULTS") {
          void finalizeResults(room).catch((error: unknown) => {
            logger.error({ roomId: room.registration.roomId, err: error }, "finalization failed");
            scheduleFinalizationRetry(room, now() + FINALIZATION_RETRY_MS);
          });
        }
      } catch (error) {
        logger.error({ roomId: room.registration.roomId, err: error }, "automatic advance failed");
      }
    });
  }

  function closeIfAllAnswered(roomId: string): void {
    const room = rooms.get(roomId);
    const round = room === undefined ? null : findOpenRound(room);

    if (room !== undefined && round !== null) {
      closeOpenRoundIfAllAnswered(room, round);
    }
  }

  function closeOpenRoundIfAllAnswered(room: LiveRoom, round: ActiveRound): void {
    if (everyConnectedParticipantAnswered(room, round, now())) {
      closeRound(room);
    }
  }

  function connect(roomId: string, participantId: string, connectionId: string): void {
    const room = rooms.get(roomId);

    if (room === undefined) {
      return;
    }

    const sockets = room.connections.get(participantId) ?? new Set<string>();
    sockets.add(connectionId);
    room.connections.set(participantId, sockets);
    endReconnectGrace(room, participantId);
  }

  function disconnect(roomId: string, participantId: string, connectionId: string): void {
    const room = rooms.get(roomId);
    const sockets = room?.connections.get(participantId);
    const lostLastSocket = sockets?.delete(connectionId) === true && sockets.size === 0;

    if (room === undefined || !lostLastSocket) {
      return;
    }

    room.connections.delete(participantId);
    beginReconnectGrace(room, participantId);
    // Without a grace, a Participant who was the last one unanswered closes the Round now.
    closeIfAllAnswered(roomId);
  }

  /** The re-check is tied to its Question, so it is harmless after that Round closes. */
  function beginReconnectGrace(room: LiveRoom, participantId: string): void {
    const round = findOpenRound(room);

    if (round === null) {
      return;
    }

    endReconnectGrace(room, participantId);
    const until = now() + reconnectGraceMs;
    const cancel = schedule(until, () => {
      room.reconnecting.delete(participantId);
      recheckAfterGrace(room, round.questionIndex);
    });
    room.reconnecting.set(participantId, { questionIndex: round.questionIndex, until, cancel });
  }

  function recheckAfterGrace(room: LiveRoom, questionIndex: number): void {
    const round = findOpenRound(room);

    if (round !== null && round.questionIndex === questionIndex) {
      closeOpenRoundIfAllAnswered(room, round);
    }
  }

  function endReconnectGrace(room: LiveRoom, participantId: string): void {
    room.reconnecting.get(participantId)?.cancel();
    room.reconnecting.delete(participantId);
  }

  function onRoundClosed(listener: RoundClosedListener): () => void {
    closedListeners.add(listener);
    return () => closedListeners.delete(listener);
  }

  function onReadyOpened(listener: (publication: AdvancePublication) => void): () => void {
    readyListeners.add(listener);
    return () => readyListeners.delete(listener);
  }

  function onAutoAdvance(listener: (publication: AdvancePublication) => void): () => void {
    advanceListeners.add(listener);
    return () => advanceListeners.delete(listener);
  }

  function dispose(): void {
    for (const room of rooms.values()) {
      room.cancelDeadline?.();
      room.cancelDeadline = null;

      for (const participantId of [...room.reconnecting.keys()]) {
        endReconnectGrace(room, participantId);
      }
    }
  }

  function answer(submission: AnswerSubmission): AnswerResult {
    const room = rooms.get(submission.roomId);

    if (room === undefined) {
      return ANSWER_ROOM_NOT_FOUND;
    }

    const { participantId } = submission;

    if (participantId === null || !hasParticipant(room, participantId)) {
      return NOT_PARTICIPANT;
    }

    const receipt = room.answerReceipts.get(
      answerReceipt(participantId, submission.questionIndex, submission.idempotencyKey),
    );

    if (receipt !== undefined) {
      return accepted(receipt);
    }

    return answerOpenRound(room, { ...submission, participantId });
  }

  function answerOpenRound(
    room: LiveRoom,
    submission: AnswerSubmission & { readonly participantId: string },
  ): AnswerResult {
    const round = findOpenRound(room);

    if (round === null) {
      return ROUND_NOT_OPEN;
    }

    if (submission.questionIndex !== round.questionIndex) {
      return WRONG_ROUND;
    }

    // Server receipt time alone decides lateness; delay compensation only affects scoring.
    if (!isAnswerOnTime(round, submission.receivedAt)) {
      return ANSWER_TOO_LATE;
    }

    const slot = answerSlot(round.questionIndex, submission.participantId);

    if (room.answers.has(slot)) {
      return ALREADY_ANSWERED;
    }

    const authoredOptionId = authoredOptionIdFor(room, round, submission);

    if (authoredOptionId === null) {
      return INVALID_OPTION;
    }

    const recorded = scoreSubmission(round, submission, authoredOptionId);
    room.answers.set(slot, recorded);
    room.answerReceipts.set(
      answerReceipt(submission.participantId, submission.questionIndex, submission.idempotencyKey),
      recorded,
    );
    return accepted(recorded);
  }

  function scoreSubmission(
    round: ActiveRound,
    submission: AnswerSubmission & { readonly participantId: string },
    authoredOptionId: string,
  ): RecordedAnswer {
    const effectiveResponseMs = effectiveResponseTime(timing, {
      startsAt: round.startsAt,
      receivedAt: submission.receivedAt,
      medianRttMs: submission.medianRoundTripMs,
    });
    const correct = authoredOptionId === round.question.correctOptionId;

    return {
      participantId: submission.participantId,
      questionIndex: round.questionIndex,
      authoredOptionId,
      optionId: submission.optionId,
      receivedAt: submission.receivedAt,
      effectiveResponseMs,
      correct,
      points: scoreAnswer(timing, { correct, effectiveResponseMs }),
    };
  }

  function answersFor(roomId: string, questionIndex: number): readonly RecordedAnswer[] {
    const room = rooms.get(roomId);
    const answers = room === undefined ? [] : [...room.answers.values()];
    return answers.filter((recorded) => recorded.questionIndex === questionIndex);
  }

  return {
    register,
    hostLobby,
    join,
    resume,
    start,
    answer,
    answersFor,
    connect,
    disconnect,
    closeIfAllAnswered,
    onRoundClosed,
    onReadyOpened,
    onAutoAdvance,
    dispose,
  };
}

/** A refused transition leaves the Room unchanged rather than crashing the handler. */
function tryTransition(
  game: GameState,
  command: GameCommand,
  serverTime: number,
): GameState | null {
  try {
    return transitionGame(game, command, serverTime).state;
  } catch {
    return null;
  }
}

/**
 * Nobody connected means nobody can still answer, so only the deadline closes the Round. A
 * Participant within their reconnect grace counts as connected.
 */
function everyConnectedParticipantAnswered(
  room: LiveRoom,
  round: ActiveRound,
  serverTime: number,
): boolean {
  const reconnecting = [...room.reconnecting.entries()]
    .filter(([, grace]) => isWithinGrace(grace, round, serverTime))
    .map(([participantId]) => participantId);
  const connected = [...new Set([...room.connections.keys(), ...reconnecting])];
  return (
    connected.length > 0 &&
    connected.every((participantId) => recordedAnswerOf(room, round, participantId) !== undefined)
  );
}

function isWithinGrace(grace: ReconnectGrace, round: ActiveRound, serverTime: number): boolean {
  return grace.questionIndex === round.questionIndex && serverTime < grace.until;
}

/** A Resume Token never signs anyone in as a different User; a Guest's token is enough alone. */
function mayReclaim(resumable: ResumableParticipant, identity: ConnectionIdentity): boolean {
  return (
    resumable.userId === null || (identity.kind === "user" && identity.userId === resumable.userId)
  );
}

/** Points from revealed Rounds, totalled like the Leaderboard so the two always agree. */
function revealedScoreOf(room: LiveRoom, participantId: string): number {
  const standing = standingsThrough(room, lastRevealedQuestion(room)).find(
    (candidate) => candidate.participantId === participantId,
  );
  return standing?.totalScore ?? 0;
}

/** An open Round is not revealed yet, so its points stay out until the reveal. */
function lastRevealedQuestion(room: LiveRoom): number {
  const { phase, questionIndex } = room.game;

  if (questionIndex === null) {
    return -1;
  }

  return phase === "QUESTION_OPEN" || phase === "GETTING_READY" ? questionIndex - 1 : questionIndex;
}

function hasParticipant(room: LiveRoom, participantId: string): boolean {
  return [...room.participants.values()].some(
    (participant) => participant.participantId === participantId,
  );
}

function answerSlot(questionIndex: number, participantId: string): string {
  return `${questionIndex}:${participantId}`;
}

/** Scoped to the Question, so a key reused for a later Question cannot replay an earlier Answer. */
function answerReceipt(
  participantId: string,
  questionIndex: number,
  idempotencyKey: string,
): string {
  return `${participantId}:${questionIndex}:${idempotencyKey}`;
}

/** Acknowledgements carry only what the Participant chose and when the server received it. */
function accepted(recorded: RecordedAnswer): AnswerResult {
  return { ok: true, answer: toLockedAnswer(recorded) };
}

function toLockedAnswer({ questionIndex, optionId, receivedAt }: RecordedAnswer): LockedAnswer {
  return { questionIndex, optionId, receivedAt };
}

function lockedAnswerFor(
  room: LiveRoom,
  round: ActiveRound,
  receiver: RoundReceiver,
): LockedAnswer | null {
  if (receiver.kind === "host") {
    return null;
  }

  const recorded = recordedAnswerOf(room, round, receiver.participantId);
  return recorded === undefined ? null : toLockedAnswer(recorded);
}

/** Maps an option id from the Participant's own id space back to the authored option. */
function authoredOptionIdFor(
  room: RoundSource,
  round: ActiveRound,
  submission: { readonly participantId: string; readonly optionId: string },
): string | null {
  const seed = participantOptionSeed(room, round, submission.participantId);
  const option = round.question.options.find(
    ({ id }) => opaqueOptionId(seed, id) === submission.optionId,
  );
  return option?.id ?? null;
}

function deliverRound(room: LiveRoom, round: ActiveRound, serverTime: number): RoundDelivery {
  const context: RoundContext = { room, round };

  return {
    host: viewRound(context, HOST_RECEIVER, serverTime),
    participants: [...room.participants.values()].map((participant) => ({
      participantId: participant.participantId,
      round: viewRound(context, participantReceiver(participant), serverTime),
    })),
  };
}

interface RoundContext {
  readonly room: LiveRoom;
  readonly round: ActiveRound;
}

function participantReceiver(participant: LobbyParticipant): RoundReceiver {
  return { kind: "participant", participantId: participant.participantId };
}

function findOpenRound(room: RoundSource): ActiveRound | null {
  return room.game.phase === "QUESTION_OPEN" ? findActiveRound(room) : null;
}

function isRoundPhase(phase: GameState["phase"]): boolean {
  return phase === "QUESTION_OPEN" || phase === "QUESTION_REVEAL";
}

function findActiveRound({ registration, game }: RoundSource): ActiveRound | null {
  const { phase, questionIndex, roundStartsAt, roundEndsAt, roundClosedAt } = game;

  if (
    !isRoundPhase(phase) ||
    questionIndex === null ||
    roundStartsAt === null ||
    roundEndsAt === null
  ) {
    return null;
  }

  const question = registration.questions[questionIndex];

  if (question === undefined) {
    return null;
  }

  return {
    roomId: registration.roomId,
    questionIndex,
    questionCount: registration.questions.length,
    startsAt: roundStartsAt,
    endsAt: roundEndsAt,
    closedAt: phase === "QUESTION_REVEAL" ? roundClosedAt : null,
    question,
  };
}

/**
 * The Host sees the authored order and ids. Each Participant gets a stable order of their own,
 * with ids opaque to them, so neither the order nor the ids reveal the authored sequence.
 */
function optionsFor(
  room: RoundSource,
  round: ActiveRound,
  receiver: RoundReceiver,
): RoomQuestion["options"] {
  const { options } = round.question;

  switch (receiver.kind) {
    case "host":
      return options;
    case "participant": {
      const seed = participantOptionSeed(room, round, receiver.participantId);
      return orderOptions(options, seed).map(({ id, text }) => ({
        id: opaqueOptionId(seed, id),
        text,
      }));
    }
  }
}

function participantOptionSeed(
  room: RoundSource,
  round: ActiveRound,
  participantId: string,
): string {
  return `${room.optionSalt}:${round.questionIndex}:${participantId}`;
}

const OPAQUE_OPTION_ID_LENGTH = 16;

function opaqueOptionId(seed: string, authoredOptionId: string): string {
  return createHash("sha256")
    .update(`${seed}:${authoredOptionId}`)
    .digest("base64url")
    .slice(0, OPAQUE_OPTION_ID_LENGTH);
}

/** The open view never carries the correct option; only a closed Round reveals it. */
function viewRound(context: RoundContext, receiver: RoundReceiver, serverTime: number): RoundView {
  const { room, round } = context;
  const shared = {
    roomId: round.roomId,
    questionIndex: round.questionIndex,
    questionCount: round.questionCount,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    serverTime,
    question: toPublicQuestion(round.question, optionsFor(room, round, receiver)),
    answer: lockedAnswerFor(room, round, receiver),
  };

  if (round.closedAt === null) {
    return { ...shared, phase: "QUESTION_OPEN" };
  }

  return {
    ...shared,
    phase: "QUESTION_REVEAL",
    closedAt: round.closedAt,
    revealEndsAt: round.closedAt + REVEAL_DURATION_MS,
    correctOptionId: correctOptionIdFor(room, round, receiver),
    result: resultFor(room, round, receiver),
    scores: roundScores(room, round),
    leaderboard: leaderboardAfter(room, round),
  };
}

/** The correct option in the receiver's own id space; the Host sees the authored id. */
function correctOptionIdFor(
  room: RoundSource,
  round: ActiveRound,
  receiver: RoundReceiver,
): string {
  const { correctOptionId } = round.question;

  switch (receiver.kind) {
    case "host":
      return correctOptionId;
    case "participant":
      return opaqueOptionId(
        participantOptionSeed(room, round, receiver.participantId),
        correctOptionId,
      );
  }
}

function resultFor(
  room: LiveRoom,
  round: ActiveRound,
  receiver: RoundReceiver,
): RoundResult | null {
  return receiver.kind === "host"
    ? null
    : resultOf(recordedAnswerOf(room, round, receiver.participantId));
}

function recordedAnswerOf(
  room: LiveRoom,
  round: ActiveRound,
  participantId: string,
): RecordedAnswer | undefined {
  return room.answers.get(answerSlot(round.questionIndex, participantId));
}

function resultOf(recorded: RecordedAnswer | undefined): RoundResult {
  return recorded === undefined
    ? UNANSWERED_RESULT
    : { correct: recorded.correct, points: recorded.points };
}

/**
 * Every joined Participant in join order; without an accepted Answer a Participant earns 0 and
 * has no Effective Response Time. Only revealed Rounds carry these scores.
 */
function roundScores(room: LiveRoom, round: ActiveRound): RoundScore[] {
  return [...room.participants.values()].map(({ participantId, displayName }) => {
    const recorded = recordedAnswerOf(room, round, participantId);
    return {
      participantId,
      displayName,
      answered: recorded !== undefined,
      ...resultOf(recorded),
      effectiveResponseMs: recorded?.effectiveResponseMs ?? null,
    };
  });
}

/** Cumulative standings through this closed Round; movement compares with the Round before it. */
function leaderboardAfter(room: LiveRoom, round: ActiveRound): LeaderboardEntry[] {
  const previous =
    round.questionIndex === 0 ? null : standingsThrough(room, round.questionIndex - 1);
  const ranked = rankStandings(standingsThrough(room, round.questionIndex), previous);
  const names = new Map(
    [...room.participants.values()].map(({ participantId, displayName }) => [
      participantId,
      displayName,
    ]),
  );

  return ranked.map(({ participantId, rank, totalScore, movement }) => ({
    participantId,
    displayName: names.get(participantId) ?? "",
    rank,
    totalScore,
    movement,
  }));
}

/** Final metrics of every joined Participant, from accepted Answers and the Question snapshot. */
function finalResults(room: LiveRoom, completedAt: number): CompleteRoomInput {
  const summaries = summarizeMatch({
    questionTopics: room.registration.questions.map(({ topic }) => topic),
    participants: [...room.participants.values()].map(({ participantId }) => ({
      participantId,
      joinedAt: room.joinedAt.get(participantId) ?? 0,
    })),
    answers: [...room.answers.values()],
  });

  return {
    roomId: room.registration.roomId,
    completedAt: new Date(completedAt),
    results: summaries.map((summary) => ({
      participantId: summary.participantId,
      rank: summary.rank,
      totalScore: summary.totalScore,
      correctAnswers: summary.correctAnswers,
      totalAnswers: summary.questionCount,
      averageResponseMs: summary.averageResponseMs,
      topicStats: summary.topics,
    })),
  };
}

/** Every joined Participant's score from accepted Answers of Questions 0 through `lastQuestion`. */
function standingsThrough(room: LiveRoom, lastQuestion: number): Standing[] {
  const answers = [...room.answers.values()].filter(
    (recorded) => recorded.questionIndex <= lastQuestion,
  );

  return [...room.participants.values()].map(({ participantId }) => {
    const own = answers.filter((recorded) => recorded.participantId === participantId);
    const correct = own.filter((recorded) => recorded.correct);
    return {
      participantId,
      joinedAt: room.joinedAt.get(participantId) ?? 0,
      totalScore: sum(own.map((recorded) => recorded.points)),
      correctResponseMs: sum(correct.map((recorded) => recorded.effectiveResponseMs)),
    };
  });
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Copies only public fields: the stored Question also holds the correct option. */
function toPublicQuestion(
  question: RoomQuestion,
  options: RoomQuestion["options"],
): PublicQuestion {
  const publicQuestion: PublicQuestion = {
    text: question.text,
    options: options.map(({ id, text }) => ({ id, text })),
    topic: question.topic,
    difficulty: question.difficulty,
  };

  return question.media === undefined
    ? publicQuestion
    : { ...publicQuestion, media: question.media };
}

function isRoomHost(room: LiveRoom, identity: ConnectionIdentity): boolean {
  return identity.kind === "user" && identity.userId === room.registration.hostUserId;
}

/** A signed-in User is one identity per Room; a Guest is identified by their join idempotency key. */
function participantIdentityKey(identity: ConnectionIdentity, idempotencyKey: string): string {
  return identity.kind === "user" ? `user:${identity.userId}` : `guest:${idempotencyKey}`;
}

function participantCollegeId(room: LiveRoom, identity: ConnectionIdentity): string {
  const homeCollegeId = identity.kind === "user" ? identity.homeCollegeId : null;
  return homeCollegeId ?? room.registration.college.id;
}

function occupiedSlots(room: LiveRoom): number {
  return room.participants.size + room.pendingJoins.size;
}

function asRetry(result: JoinResult): JoinResult {
  return result.ok ? { ...result, rosterChanged: false } : result;
}

function toLobby(room: LiveRoom, serverTime: number): LobbySnapshot {
  const { registration } = room;

  return {
    roomId: registration.roomId,
    joinCode: registration.joinCode,
    phase: room.game.phase,
    ...(room.game.phase === "GETTING_READY" && room.game.readyEndsAt !== null
      ? {
          ready: {
            questionIndex: room.game.questionIndex ?? 0,
            endsAt: room.game.readyEndsAt,
            serverTime,
          },
        }
      : {}),
    college: registration.college,
    questionSetTitle: registration.questionSetTitle,
    questionCount: registration.questions.length,
    participants: [...room.participants.values()],
    rules: room.rules,
    ...(room.game.phase === "FINISHED" && room.results !== null ? { results: room.results } : {}),
  };
}

/** Shapes the saved MatchResults for the Room, so every viewer gets the committed values and order. */
function toFinalResults(room: LiveRoom, committed: readonly CommittedMatchResult[]): FinalResult[] {
  const names = new Map(
    [...room.participants.values()].map(({ participantId, displayName }) => [
      participantId,
      displayName,
    ]),
  );

  return [...committed]
    .sort((first, second) => first.rank - second.rank)
    .map((saved) => ({
      participantId: saved.participantId,
      displayName: names.get(saved.participantId) ?? "",
      rank: saved.rank,
      totalScore: saved.totalScore,
      correctAnswers: saved.correctAnswers,
      totalQuestions: saved.totalAnswers,
      averageResponseMs: saved.averageResponseMs,
      topics: saved.topicStats.map(({ topic, correct, total }) => ({ topic, correct, total })),
    }));
}
