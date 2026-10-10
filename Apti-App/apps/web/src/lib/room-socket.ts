import {
  type ClientToServerEvents,
  type LobbyParticipant,
  type LobbySnapshot,
  lobbySnapshotSchema,
  type RoomJoin,
  roomJoinResponseSchema,
  type ServerToClientEvents,
  type SocketHandshakeAuth,
} from "@aptiquiz/contracts";
import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import type { JoinFailure } from "./room-errors";
import { requestSocketAuth } from "./socket-auth";

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type RoomSocketOptions = Partial<ManagerOptions & SocketOptions>;

interface RoomSocketDependencies {
  readonly serverUrl?: string;
  readonly connect?: (url: string, options: RoomSocketOptions) => RoomSocket;
  readonly requestAuth?: () => Promise<SocketHandshakeAuth>;
}

export type JoinResult =
  | { ok: true; participant: LobbyParticipant; lobby: LobbySnapshot }
  | { ok: false; error: JoinFailure };

export type SendRoomJoin = (payload: RoomJoin, acknowledge: (response: unknown) => void) => void;

const DEFAULT_GAME_SERVER_URL = "http://localhost:3001";
const JOIN_ACK_TIMEOUT_MS = 10_000;

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

  return connect(serverUrl, {
    auth: (callback) => {
      void requestAuth().then(callback);
    },
    reconnection: true,
    transports: ["websocket"],
  });
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

/** Returns a valid `room:lobby` snapshot for the given Room, or null. */
export function parseLobbyUpdate(payload: unknown, roomId: string): LobbySnapshot | null {
  const parsed = lobbySnapshotSchema.safeParse(payload);
  return parsed.success && parsed.data.roomId === roomId ? parsed.data : null;
}
