import { createHash, randomUUID } from "node:crypto";
import {
  type ConnectionIdentity,
  type LobbyParticipant,
  type LobbySnapshot,
  MAX_ROOM_PARTICIPANTS,
  type PublicQuestion,
  type RoomError,
  type RoomQuestion,
  type RoomRegistration,
  type RoundView,
} from "@aptiquiz/contracts";
import {
  createGameState,
  type GameState,
  orderOptions,
  transitionGame,
} from "@aptiquiz/game-engine";
import type { Logger } from "pino";
import type { RoomStore } from "./room-store.js";

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
      readonly rosterChanged: boolean;
    }
  | RoomFailure;

/** Each receiver's view of a newly opened Round; Participants get their own option order. */
export interface RoundDelivery {
  readonly host: RoundView;
  readonly participants: readonly ParticipantRound[];
}

export interface ParticipantRound {
  readonly participantId: string;
  readonly round: RoundView;
}

/** `delivery` is null when a retried start repeats the first result without a transition. */
export type StartResult =
  | { readonly ok: true; readonly lobby: LobbySnapshot; readonly delivery: RoundDelivery | null }
  | RoomFailure;

/** A join whose code and display name already passed the public contract schemas. */
export interface ValidJoinRequest {
  readonly joinCode: string;
  readonly displayName: string;
  readonly idempotencyKey: string;
}

interface StartRecord {
  readonly idempotencyKey: string;
  readonly lobby: LobbySnapshot;
}

interface LiveRoom {
  readonly registration: RoomRegistration;
  /** Random per Room so clients cannot predict another Participant's option order. */
  readonly optionSalt: string;
  game: GameState;
  start: StartRecord | null;
  /** Joined Participants keyed by identity, in join order. */
  readonly participants: Map<string, LobbyParticipant>;
  /** Reserved slots whose persistence is still in flight, keyed by identity. */
  readonly pendingJoins: Map<string, Promise<JoinResult>>;
}

/** The game state and Questions a Round view is built from. */
interface RoundSource {
  readonly registration: RoomRegistration;
  readonly optionSalt: string;
  readonly game: GameState;
}

interface ActiveRound {
  readonly roomId: string;
  readonly questionIndex: number;
  readonly questionCount: number;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly question: RoomQuestion;
}

type RoundReceiver =
  | { readonly kind: "host" }
  | { readonly kind: "participant"; readonly participantId: string };

const HOST_RECEIVER: RoundReceiver = { kind: "host" };

export interface RoomRegistryDependencies {
  readonly store: RoomStore;
  readonly logger: Logger;
  readonly roundDurationMs: number;
  readonly now: () => number;
}

export interface RoomRegistry {
  register(registration: RoomRegistration): RegistrationResult;
  hostLobby(roomId: string, identity: ConnectionIdentity): HostResult;
  join(request: ValidJoinRequest, identity: ConnectionIdentity): Promise<JoinResult>;
  start(roomId: string, idempotencyKey: string, identity: ConnectionIdentity): StartResult;
}

const ROOM_NOT_FOUND: RoomFailure = { ok: false, error: "room_not_found" };
const NOT_ROOM_HOST: RoomFailure = { ok: false, error: "not_room_host" };
const ROOM_NOT_IN_LOBBY: RoomFailure = { ok: false, error: "room_not_in_lobby" };
const ROOM_FULL: RoomFailure = { ok: false, error: "room_full" };
const JOIN_FAILED: RoomFailure = { ok: false, error: "join_failed" };
const START_FAILED: RoomFailure = { ok: false, error: "start_failed" };

export function createRoomRegistry(dependencies: RoomRegistryDependencies): RoomRegistry {
  const { store, logger, roundDurationMs, now } = dependencies;
  const rooms = new Map<string, LiveRoom>();
  const roomIdsByJoinCode = new Map<string, string>();

  function register(registration: RoomRegistration): RegistrationResult {
    if (rooms.has(registration.roomId)) {
      return { ok: true };
    }

    if (roomIdsByJoinCode.has(registration.joinCode)) {
      return { ok: false, error: "join_code_taken" };
    }

    rooms.set(registration.roomId, {
      registration,
      optionSalt: randomUUID(),
      game: createGameState(registration.roomId, registration.questions.length),
      start: null,
      participants: new Map(),
      pendingJoins: new Map(),
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

    return { ok: true, lobby: toLobby(room), round: currentRoundView(room, HOST_RECEIVER) };
  }

  function currentRoundView(room: LiveRoom, receiver: RoundReceiver): RoundView | null {
    const round = findActiveRound(room);
    return round === null ? null : viewRound(round, optionsFor(room, round, receiver), now());
  }

  function join(request: ValidJoinRequest, identity: ConnectionIdentity): Promise<JoinResult> {
    const roomId = roomIdsByJoinCode.get(request.joinCode);
    const room = roomId === undefined ? undefined : rooms.get(roomId);

    if (room === undefined) {
      return Promise.resolve(ROOM_NOT_FOUND);
    }

    const identityKey = participantIdentityKey(identity, request.idempotencyKey);
    const joined = room.participants.get(identityKey);

    if (joined !== undefined) {
      return Promise.resolve({
        ok: true,
        participant: joined,
        lobby: toLobby(room),
        round: currentRoundView(room, participantReceiver(joined)),
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
    try {
      const { participantId } = await store.recordParticipant({
        roomId: room.registration.roomId,
        collegeId: participantCollegeId(room, identity),
        userId: identity.kind === "user" ? identity.userId : null,
        displayName: request.displayName,
        idempotencyKey: request.idempotencyKey,
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
      room.participants.set(identityKey, participant);
      return { ok: true, participant, lobby: toLobby(room), round: null, rosterChanged: true };
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
        ? { ok: true, lobby: room.start.lobby, delivery: null }
        : ROOM_NOT_IN_LOBBY;
    }

    return startFromLobby(room, idempotencyKey);
  }

  function startFromLobby(room: LiveRoom, idempotencyKey: string): StartResult {
    if (room.game.phase !== "LOBBY") {
      return ROOM_NOT_IN_LOBBY;
    }

    const serverTime = now();
    let started: GameState;

    try {
      started = transitionGame(
        room.game,
        { type: "START", durationMs: roundDurationMs },
        serverTime,
      ).state;
    } catch {
      return START_FAILED;
    }

    const round = findActiveRound({ ...room, game: started });

    if (round === null) {
      return START_FAILED;
    }

    room.game = started;
    const lobby = toLobby(room);
    room.start = { idempotencyKey, lobby };
    return { ok: true, lobby, delivery: deliverRound(room, round, serverTime) };
  }

  return { register, hostLobby, join, start };
}

function deliverRound(room: LiveRoom, round: ActiveRound, serverTime: number): RoundDelivery {
  return {
    host: viewRound(round, optionsFor(room, round, HOST_RECEIVER), serverTime),
    participants: [...room.participants.values()].map((participant) => ({
      participantId: participant.participantId,
      round: viewRound(
        round,
        optionsFor(room, round, participantReceiver(participant)),
        serverTime,
      ),
    })),
  };
}

function participantReceiver(participant: LobbyParticipant): RoundReceiver {
  return { kind: "participant", participantId: participant.participantId };
}

function findActiveRound({ registration, game }: RoundSource): ActiveRound | null {
  const { phase, questionIndex, roundStartsAt, roundEndsAt } = game;

  if (
    phase !== "QUESTION_OPEN" ||
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
      const seed = `${room.optionSalt}:${round.questionIndex}:${receiver.participantId}`;
      return orderOptions(options, seed).map(({ id, text }) => ({
        id: opaqueOptionId(seed, id),
        text,
      }));
    }
  }
}

const OPAQUE_OPTION_ID_LENGTH = 16;

function opaqueOptionId(seed: string, authoredOptionId: string): string {
  return createHash("sha256")
    .update(`${seed}:${authoredOptionId}`)
    .digest("base64url")
    .slice(0, OPAQUE_OPTION_ID_LENGTH);
}

function viewRound(
  round: ActiveRound,
  options: RoomQuestion["options"],
  serverTime: number,
): RoundView {
  return {
    phase: "QUESTION_OPEN",
    roomId: round.roomId,
    questionIndex: round.questionIndex,
    questionCount: round.questionCount,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    serverTime,
    question: toPublicQuestion(round.question, options),
  };
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

function toLobby(room: LiveRoom): LobbySnapshot {
  const { registration } = room;

  return {
    roomId: registration.roomId,
    joinCode: registration.joinCode,
    phase: room.game.phase,
    college: registration.college,
    questionSetTitle: registration.questionSetTitle,
    questionCount: registration.questions.length,
    participants: [...room.participants.values()],
  };
}
