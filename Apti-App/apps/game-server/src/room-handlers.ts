import {
  displayNameSchema,
  type LobbySnapshot,
  type RoomError,
  roomAdvanceSchema,
  roomCodeSchema,
  roomHostSchema,
  roomJoinSchema,
  roomStartSchema,
  roundAnswerSchema,
} from "@aptiquiz/contracts";
import type { Logger } from "pino";
import { safeAcknowledge } from "./acknowledgement.js";
import type { GameSocket, GameSocketServer } from "./game-socket.js";
import type { LatencySampler } from "./latency-sampler.js";
import type { RoomStore } from "./room-store.js";
import type {
  AdvancePublication,
  RoomRegistry,
  RoundClosure,
  RoundDelivery,
  ValidJoinRequest,
} from "./rooms.js";

type JoinValidation =
  | { readonly ok: true; readonly request: ValidJoinRequest }
  | { readonly ok: false; readonly error: RoomError };

interface RoomHandlerDependencies {
  readonly io: GameSocketServer;
  readonly registry: RoomRegistry;
  readonly store: RoomStore;
  readonly logger: Logger;
  readonly latency: LatencySampler;
  readonly now: () => number;
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

function publishLobby(io: GameSocketServer, lobby: LobbySnapshot): void {
  io.to(lobbyChannel(lobby.roomId)).emit("room:lobby", lobby);
}

function publishRound(io: GameSocketServer, roomId: string, delivery: RoundDelivery): void {
  io.to(hostChannel(roomId)).emit("round:state", delivery.host);

  for (const { participantId, round } of delivery.participants) {
    io.to(participantChannel(roomId, participantId)).emit("round:state", round);
  }
}

/** A closure may come from a timer rather than a socket event, so it publishes to the Room. */
export function publishRoundClosure(io: GameSocketServer, { lobby, delivery }: RoundClosure): void {
  publishLobby(io, lobby);
  publishRound(io, lobby.roomId, delivery);
}

/** A finished Room only changes its phase; a new Round also reaches every receiver. */
function publishAdvance(io: GameSocketServer, { lobby, delivery }: AdvancePublication): void {
  publishLobby(io, lobby);

  if (delivery !== null) {
    publishRound(io, lobby.roomId, delivery);
  }
}

export function registerRoomHandlers(socket: GameSocket, dependencies: RoomHandlerDependencies) {
  const { io, registry, store, logger, latency, now } = dependencies;
  /** The Participant this socket joined as, by Room; it authorizes this socket's Answers. */
  const joinedParticipants = new Map<string, string>();

  /** Tracks which Participant this socket counts as connected for, one per Room. */
  const attachParticipant = (roomId: string, participantId: string) => {
    const previous = joinedParticipants.get(roomId);

    if (previous !== undefined && previous !== participantId) {
      registry.disconnect(roomId, previous, socket.id);
      socket.leave(participantChannel(roomId, previous));
    }

    joinedParticipants.set(roomId, participantId);
    registry.connect(roomId, participantId, socket.id);
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

    // The socket may have dropped during the database write; tracking it now would leave a
    // connection that never disconnects and block early Round closure.
    if (!socket.connected) {
      return;
    }

    socket.join([
      lobbyChannel(lobby.roomId),
      participantChannel(lobby.roomId, participant.participantId),
    ]);
    attachParticipant(lobby.roomId, participant.participantId);
    acknowledge({ ok: true, participant, lobby, round });
    latency.track(socket);

    if (result.rosterChanged) {
      publishLobby(io, result.lobby);
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
      publishLobby(io, result.lobby);
      publishRound(io, roomId, result.delivery);
      await persistRoomStatus(() => store.markRoomStarted(roomId), roomId, logger);
    }
  });

  socket.on("room:advance", async (payload, callback) => {
    const acknowledge = safeAcknowledge(callback);
    const parsed = roomAdvanceSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge(INVALID_REQUEST);
      return;
    }

    const { roomId, idempotencyKey } = parsed.data;
    const result = registry.advance(roomId, idempotencyKey, socket.data.identity);

    if (!result.ok) {
      acknowledge(result);
      return;
    }

    socket.join(hostChannels(roomId));
    acknowledge({ ok: true, lobby: result.lobby, round: result.round });

    if (result.publication !== null) {
      publishAdvance(io, result.publication);
    }

    const finishedNow = result.publication !== null && result.round === null;

    if (finishedNow) {
      await persistRoomStatus(() => store.markRoomFinished(roomId), roomId, logger);
    }
  });

  socket.on("round:answer", (payload, callback) => {
    const receivedAt = now();
    const acknowledge = safeAcknowledge(callback);
    const parsed = roundAnswerSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge(INVALID_REQUEST);
      return;
    }

    const { roomId } = parsed.data;
    acknowledge(
      registry.answer({
        ...parsed.data,
        participantId: joinedParticipants.get(roomId) ?? null,
        receivedAt,
        medianRoundTripMs: latency.medianRoundTripMs(socket.id),
      }),
    );
    // After the acknowledgement, so the Participant learns their Answer locked before the reveal.
    registry.closeIfAllAnswered(roomId);
  });

  socket.on("disconnect", () => {
    for (const [roomId, participantId] of joinedParticipants) {
      registry.disconnect(roomId, participantId, socket.id);
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
async function persistRoomStatus(
  write: () => Promise<void>,
  roomId: string,
  logger: Logger,
): Promise<void> {
  try {
    await write();
  } catch (error) {
    logger.error({ roomId, err: error }, "failed to record room status");
  }
}
