import {
  type ClientToServerEvents,
  displayNameSchema,
  type InterServerEvents,
  type LobbySnapshot,
  type RoomError,
  roomCodeSchema,
  roomHostSchema,
  roomJoinSchema,
  roomStartSchema,
  type ServerToClientEvents,
  type SocketData,
} from "@aptiquiz/contracts";
import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";
import { safeAcknowledge } from "./acknowledgement.js";
import type { RoomStore } from "./room-store.js";
import type { RoomRegistry, RoundDelivery, ValidJoinRequest } from "./rooms.js";

type GameSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

type JoinValidation =
  | { readonly ok: true; readonly request: ValidJoinRequest }
  | { readonly ok: false; readonly error: RoomError };

interface RoomHandlerDependencies {
  readonly io: GameSocketServer;
  readonly registry: RoomRegistry;
  readonly store: RoomStore;
  readonly logger: Logger;
}

const INVALID_REQUEST = { ok: false, error: "invalid_request" } as const;

export function lobbyChannel(roomId: string): string {
  return `room:${roomId}`;
}

/** Every socket of one Participant, so each receives that Participant's own option order. */
function participantChannel(roomId: string, participantId: string): string {
  return `participant:${roomId}:${participantId}`;
}

function hostChannel(roomId: string): string {
  return `host:${roomId}`;
}

/** The Host follows both the Lobby and the Host's own Round view. */
function hostChannels(roomId: string): string[] {
  return [lobbyChannel(roomId), hostChannel(roomId)];
}

export function registerRoomHandlers(socket: GameSocket, dependencies: RoomHandlerDependencies) {
  const { io, registry, store, logger } = dependencies;
  const publishLobby = (lobby: LobbySnapshot) =>
    io.to(lobbyChannel(lobby.roomId)).emit("room:lobby", lobby);
  const publishRound = (roomId: string, delivery: RoundDelivery) => {
    io.to(hostChannel(roomId)).emit("round:state", delivery.host);

    for (const { participantId, round } of delivery.participants) {
      io.to(participantChannel(roomId, participantId)).emit("round:state", round);
    }
  };

  socket.on("room:host", (payload, callback) => {
    const acknowledge = safeAcknowledge(callback);
    const parsed = roomHostSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge(INVALID_REQUEST);
      return;
    }

    const result = registry.hostLobby(parsed.data.roomId, socket.data.identity);

    if (result.ok) {
      socket.join(hostChannels(result.lobby.roomId));
    }

    acknowledge(result);
  });

  socket.on("room:join", async (payload, callback) => {
    const acknowledge = safeAcknowledge(callback);
    const validation = validateJoin(payload);

    if (!validation.ok) {
      acknowledge({ ok: false, error: validation.error });
      return;
    }

    const result = await registry.join(validation.request, socket.data.identity);

    if (!result.ok) {
      acknowledge(result);
      return;
    }

    const { participant, lobby, round } = result;
    socket.join([
      lobbyChannel(lobby.roomId),
      participantChannel(lobby.roomId, participant.participantId),
    ]);
    acknowledge({ ok: true, participant, lobby, round });

    if (result.rosterChanged) {
      publishLobby(result.lobby);
    }
  });

  socket.on("room:start", async (payload, callback) => {
    const acknowledge = safeAcknowledge(callback);
    const parsed = roomStartSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge(INVALID_REQUEST);
      return;
    }

    const { roomId, idempotencyKey } = parsed.data;
    const result = registry.start(roomId, idempotencyKey, socket.data.identity);

    if (!result.ok) {
      acknowledge(result);
      return;
    }

    socket.join(hostChannels(roomId));
    acknowledge({ ok: true, lobby: result.lobby });

    if (result.delivery !== null) {
      publishLobby(result.lobby);
      publishRound(roomId, result.delivery);
      await persistRoomStart(store, roomId, logger);
    }
  });
}

function validateJoin(payload: unknown): JoinValidation {
  const request = roomJoinSchema.safeParse(payload);

  if (!request.success) {
    return { ok: false, error: "invalid_request" };
  }

  const joinCode = roomCodeSchema.safeParse(request.data.joinCode);

  if (!joinCode.success) {
    return { ok: false, error: "invalid_join_code" };
  }

  const displayName = displayNameSchema.safeParse(request.data.displayName);

  if (!displayName.success) {
    return { ok: false, error: "invalid_display_name" };
  }

  return {
    ok: true,
    request: {
      joinCode: joinCode.data,
      displayName: displayName.data,
      idempotencyKey: request.data.idempotencyKey,
    },
  };
}

/** The live transition stays authoritative; a failed write is logged rather than undone. */
async function persistRoomStart(store: RoomStore, roomId: string, logger: Logger): Promise<void> {
  try {
    await store.markRoomStarted(roomId);
  } catch (error) {
    logger.error({ roomId, err: error }, "failed to record room start");
  }
}
