import {
  type ClientToServerEvents,
  type LobbyParticipant,
  type LobbySnapshot,
  type LockedAnswer,
  lobbySnapshotSchema,
  type RoomJoin,
  type RoundAnswer,
  type RoundView,
  roomJoinResponseSchema,
  roundAnswerResponseSchema,
  roundViewSchema,
  type ServerToClientEvents,
  type SocketHandshakeAuth,
} from "@aptiquiz/contracts";
import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import type { AnswerFailure, JoinFailure } from "./room-errors";
import { requestSocketAuth } from "./socket-auth";

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type RoomSocketOptions = Partial<ManagerOptions & SocketOptions>;

interface RoomSocketDependencies {
  readonly serverUrl?: string;
  readonly connect?: (url: string, options: RoomSocketOptions) => RoomSocket;
  readonly requestAuth?: () => Promise<SocketHandshakeAuth>;
}

export type JoinResult =
  | { ok: true; participant: LobbyParticipant; lobby: LobbySnapshot; round: RoundView | null }
  | { ok: false; error: JoinFailure };

export type SendRoomJoin = (payload: RoomJoin, acknowledge: (response: unknown) => void) => void;

export type AnswerResult = { ok: true; answer: LockedAnswer } | { ok: false; error: AnswerFailure };

export type SendRoundAnswer = (
  payload: RoundAnswer,
  acknowledge: (response: unknown) => void,
) => void;

const DEFAULT_GAME_SERVER_URL = "http://localhost:3001";
const JOIN_ACK_TIMEOUT_MS = 10_000;
// Short enough to retry inside a 30-second Round; the retry reuses the key, so it is safe.
const ANSWER_ACK_TIMEOUT_MS = 5_000;

/**
 * Opens a typed Game Server connection. Each connection attempt, including automatic
 * reconnects, requests a fresh Socket Ticket so a signed-in User is identified and a
 * Guest connects without one.
 */
export function createRoomSocket(dependencies: RoomSocketDependencies = {}): RoomSocket {
  const {
    serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? DEFAULT_GAME_SERVER_URL,
    connect = io,
    requestAuth = requestSocketAuth,
  } = dependencies;

  const socket = connect(serverUrl, {
    auth: (callback) => {
      void requestAuth().then(callback);
    },
    reconnection: true,
    transports: ["websocket"],
  });
  // The Game Server measures round-trip delay for scoring; any wait here would inflate it.
  socket.on("latency:ping", (_payload, acknowledge) => acknowledge());
  return socket;
}

/** Sends `room:join` and validates the acknowledgement; a missing answer becomes `no_response`. */
export function emitRoomJoin(
  send: SendRoomJoin,
  attempt: RoomJoin,
  timeoutMs = JOIN_ACK_TIMEOUT_MS,
): Promise<JoinResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "no_response" }), timeoutMs);

    send(attempt, (response) => {
      clearTimeout(timer);
      const parsed = roomJoinResponseSchema.safeParse(response);
      resolve(parsed.success ? parsed.data : { ok: false, error: "join_failed" });
    });
  });
}

/**
 * Sends `round:answer` and validates the acknowledgement. No answer in time becomes
 * `no_response` and a malformed one `answer_failed`; both are retried with the same key.
 */
export function emitRoundAnswer(
  send: SendRoundAnswer,
  payload: RoundAnswer,
  timeoutMs = ANSWER_ACK_TIMEOUT_MS,
): Promise<AnswerResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "no_response" }), timeoutMs);

    send(payload, (response) => {
      clearTimeout(timer);
      const parsed = roundAnswerResponseSchema.safeParse(response);
      resolve(parsed.success ? parsed.data : { ok: false, error: "answer_failed" });
    });
  });
}

/** Returns a valid `room:lobby` snapshot for the given Room, or null. */
export function parseLobbyUpdate(payload: unknown, roomId: string): LobbySnapshot | null {
  const parsed = lobbySnapshotSchema.safeParse(payload);
  return parsed.success && parsed.data.roomId === roomId ? parsed.data : null;
}

/** Returns a valid `round:state` view for the given Room, or null. */
export function parseRoundUpdate(payload: unknown, roomId: string): RoundView | null {
  const parsed = roundViewSchema.safeParse(payload);
  return parsed.success && parsed.data.roomId === roomId ? parsed.data : null;
}
