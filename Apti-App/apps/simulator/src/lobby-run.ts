import { randomUUID } from "node:crypto";
import {
  type ClientToServerEvents,
  type LobbySnapshot,
  type RoomJoinResponse,
  roomHostResponseSchema,
  roomJoinResponseSchema,
  type ServerToClientEvents,
  timePingResponseSchema,
} from "@aptiquiz/contracts";
import { io, type Socket } from "socket.io-client";
import {
  type SimulatorConfig,
  STARTER_QUESTION_COUNT,
  STARTER_QUESTION_SET_TITLE,
} from "./config.js";
import type { HostAccess } from "./setup.js";
import { LatencyRecorder, type LatencySummary } from "./stats.js";

export type SimulatorSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const STEP_TIMEOUT_MS = 10_000;

export interface LobbyStageResult {
  connectedSockets: number;
  joinedParticipants: number;
  distinctParticipantIds: number;
  lobbyParticipants: number;
  latencyMs: Record<string, LatencySummary>;
}

export class LobbyStageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LobbyStageError";
  }
}

function withTimeout<T>(promise: Promise<T>, step: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new LobbyStageError(`${step} did not finish within ${STEP_TIMEOUT_MS}ms`)),
      STEP_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function connect(url: string, ticket: string | null, label: string): Promise<SimulatorSocket> {
  const socket: SimulatorSocket = io(url, {
    forceNew: true,
    reconnection: false,
    timeout: STEP_TIMEOUT_MS,
    transports: ["websocket"],
    ...(ticket ? { auth: { ticket } } : {}),
  });
  const connected = new Promise<SimulatorSocket>((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (error) => {
      socket.disconnect();
      reject(new LobbyStageError(`${label} could not connect: ${error.message}`));
    });
  });
  return withTimeout(connected, `${label} connection`).catch((error: unknown) => {
    socket.disconnect();
    throw error;
  });
}

async function timed<T>(
  recorder: LatencyRecorder,
  metric: string,
  send: (acknowledge: (response: unknown) => void) => void,
  parse: (response: unknown) => T,
  step: string,
): Promise<T> {
  const sentAt = performance.now();
  const response = await withTimeout(new Promise<unknown>((resolve) => send(resolve)), step);
  recorder.record(metric, performance.now() - sentAt);
  return parse(response);
}

function describeFailure(step: string, response: { ok: false; error: string }): never {
  throw new LobbyStageError(`${step} was refused: ${response.error}`);
}

function checkStarterFixture(lobby: LobbySnapshot): void {
  if (
    lobby.questionSetTitle !== STARTER_QUESTION_SET_TITLE ||
    lobby.questionCount !== STARTER_QUESTION_COUNT
  ) {
    throw new LobbyStageError(
      `Room is not the starter Question Set (${lobby.questionSetTitle}, ${lobby.questionCount} Questions)`,
    );
  }
  if (lobby.phase !== "LOBBY") {
    throw new LobbyStageError(`Room is in ${lobby.phase}, not a fresh LOBBY`);
  }
}

async function pingAndJoin(
  socket: SimulatorSocket,
  joinCode: string,
  number: number,
  recorder: LatencyRecorder,
): Promise<Extract<RoomJoinResponse, { ok: true }>> {
  const label = `Participant ${number}`;
  await timed(
    recorder,
    "timePingAck",
    (acknowledge) => socket.emit("time:ping", { clientSentAt: Date.now() }, acknowledge),
    (response) => {
      const parsed = timePingResponseSchema.parse(response);
      if (!parsed.ok) throw new LobbyStageError(`${label} time:ping refused: ${parsed.error}`);
      return parsed;
    },
    `${label} time:ping`,
  );
  return timed(
    recorder,
    "roomJoinAck",
    (acknowledge) =>
      socket.emit(
        "room:join",
        {
          joinCode,
          displayName: `Sim Player ${String(number).padStart(2, "0")}`,
          idempotencyKey: randomUUID(),
        },
        acknowledge,
      ),
    (response) => {
      const parsed = roomJoinResponseSchema.parse(response);
      return parsed.ok ? parsed : describeFailure(`${label} join`, parsed);
    },
    `${label} join`,
  );
}

function hostLobby(
  host: SimulatorSocket,
  roomId: string,
  recorder: LatencyRecorder,
  step: string,
): Promise<LobbySnapshot> {
  return timed(
    recorder,
    "roomHostAck",
    (acknowledge) => host.emit("room:host", { roomId }, acknowledge),
    (response) => {
      const parsed = roomHostResponseSchema.parse(response);
      return parsed.ok ? parsed.lobby : describeFailure(step, parsed);
    },
    step,
  );
}

/**
 * Connects the Host and N independent Guests to one fresh starter Room and proves the
 * public Lobby holds exactly N distinct Participants. Every socket closes when this returns.
 */
export async function runLobbyStage(
  config: SimulatorConfig,
  access: HostAccess,
): Promise<LobbyStageResult> {
  const recorder = new LatencyRecorder();
  const sockets: SimulatorSocket[] = [];
  try {
    const host = await connect(config.gameServerUrl, access.hostTicket, "Host");
    sockets.push(host);
    const initial = await hostLobby(host, access.roomId, recorder, "Host subscription");
    checkStarterFixture(initial);

    const numbers = Array.from({ length: config.participantCount }, (_, index) => index + 1);
    const joined = await Promise.all(
      numbers.map(async (number) => {
        const socket = await connect(config.gameServerUrl, null, `Participant ${number}`);
        sockets.push(socket);
        return pingAndJoin(socket, initial.joinCode, number, recorder);
      }),
    );

    const lobby = await hostLobby(host, access.roomId, recorder, "Host Lobby check");
    const distinctIds = new Set(joined.map((response) => response.participant.participantId));
    const lobbyIds = new Set(lobby.participants.map((participant) => participant.participantId));
    if (
      distinctIds.size !== config.participantCount ||
      lobby.participants.length !== config.participantCount ||
      lobbyIds.size !== config.participantCount ||
      ![...distinctIds].every((id) => lobbyIds.has(id))
    ) {
      throw new LobbyStageError(
        `Lobby shows ${lobby.participants.length} Participants (${lobbyIds.size} distinct); expected ${config.participantCount} matching the joins`,
      );
    }

    return {
      connectedSockets: sockets.length - 1,
      joinedParticipants: joined.length,
      distinctParticipantIds: distinctIds.size,
      lobbyParticipants: lobby.participants.length,
      latencyMs: recorder.summaries(),
    };
  } finally {
    for (const socket of sockets) socket.disconnect();
  }
}
