import {
  type ConnectionIdentity,
  type LobbyParticipant,
  type LobbySnapshot,
  MAX_ROOM_PARTICIPANTS,
  type RoomError,
  type RoomRegistration,
} from "@aptiquiz/contracts";
import { createGameState, type GameState, transitionGame } from "@aptiquiz/game-engine";
import type { RoomStore } from "./room-store.js";

/** Placeholder so the Game Engine can open the first Question; PRD #5 owns Question timing. */
export const PROVISIONAL_QUESTION_DURATION_MS = 20_000;

type RoomFailure = { readonly ok: false; readonly error: RoomError };

export type RegistrationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: "join_code_taken" };

export type LobbyResult = { readonly ok: true; readonly lobby: LobbySnapshot } | RoomFailure;

export type JoinResult =
  | {
      readonly ok: true;
      readonly participant: LobbyParticipant;
      readonly lobby: LobbySnapshot;
      readonly rosterChanged: boolean;
    }
  | RoomFailure;

export type StartResult =
  | { readonly ok: true; readonly lobby: LobbySnapshot; readonly transitioned: boolean }
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
  game: GameState;
  start: StartRecord | null;
  /** Joined Participants keyed by identity, in join order. */
  readonly participants: Map<string, LobbyParticipant>;
  /** Reserved slots whose persistence is still in flight, keyed by identity. */
  readonly pendingJoins: Map<string, Promise<JoinResult>>;
}

export interface RoomRegistry {
  register(registration: RoomRegistration): RegistrationResult;
  hostLobby(roomId: string, identity: ConnectionIdentity): LobbyResult;
  join(request: ValidJoinRequest, identity: ConnectionIdentity): Promise<JoinResult>;
  start(
    roomId: string,
    idempotencyKey: string,
    identity: ConnectionIdentity,
    now: number,
  ): StartResult;
}

const ROOM_NOT_FOUND: RoomFailure = { ok: false, error: "room_not_found" };
const NOT_ROOM_HOST: RoomFailure = { ok: false, error: "not_room_host" };
const ROOM_NOT_IN_LOBBY: RoomFailure = { ok: false, error: "room_not_in_lobby" };
const ROOM_FULL: RoomFailure = { ok: false, error: "room_full" };
const JOIN_FAILED: RoomFailure = { ok: false, error: "join_failed" };
const START_FAILED: RoomFailure = { ok: false, error: "start_failed" };

export function createRoomRegistry(store: RoomStore): RoomRegistry {
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
      game: createGameState(registration.roomId, registration.questions.length),
      start: null,
      participants: new Map(),
      pendingJoins: new Map(),
    });
    roomIdsByJoinCode.set(registration.joinCode, registration.roomId);
    return { ok: true };
  }

  function hostLobby(roomId: string, identity: ConnectionIdentity): LobbyResult {
    const room = rooms.get(roomId);

    if (room === undefined) {
      return ROOM_NOT_FOUND;
    }

    return isRoomHost(room, identity) ? { ok: true, lobby: toLobby(room) } : NOT_ROOM_HOST;
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
      const participant: LobbyParticipant = {
        participantId,
        displayName: request.displayName,
        isGuest: identity.kind === "guest",
      };
      room.participants.set(identityKey, participant);
      return { ok: true, participant, lobby: toLobby(room), rosterChanged: true };
    } catch {
      return JOIN_FAILED;
    } finally {
      room.pendingJoins.delete(identityKey);
    }
  }

  function start(
    roomId: string,
    idempotencyKey: string,
    identity: ConnectionIdentity,
    now: number,
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
        ? { ok: true, lobby: room.start.lobby, transitioned: false }
        : ROOM_NOT_IN_LOBBY;
    }

    return startFromLobby(room, idempotencyKey, now);
  }

  function startFromLobby(room: LiveRoom, idempotencyKey: string, now: number): StartResult {
    if (room.game.phase !== "LOBBY") {
      return ROOM_NOT_IN_LOBBY;
    }

    try {
      room.game = transitionGame(
        room.game,
        { type: "START", durationMs: PROVISIONAL_QUESTION_DURATION_MS },
        now,
      ).state;
    } catch {
      return START_FAILED;
    }

    const lobby = toLobby(room);
    room.start = { idempotencyKey, lobby };
    return { ok: true, lobby, transitioned: true };
  }

  return { register, hostLobby, join, start };
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
