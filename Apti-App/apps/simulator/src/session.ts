import { randomUUID } from "node:crypto";
import {
  type ClientToServerEvents,
  type LobbySnapshot,
  lobbySnapshotSchema,
  type RoomJoinResponse,
  roomHostResponseSchema,
  roomJoinResponseSchema,
  type ServerToClientEvents,
  timePingResponseSchema,
} from "@aptiquiz/contracts";
import { io, type Socket } from "socket.io-client";
import { type Cohort, cohortOf } from "./cohorts.js";
import {
  type SimulatorConfig,
  STARTER_QUESTION_COUNT,
  STARTER_QUESTION_SET_TITLE,
} from "./config.js";
import { EventLog } from "./event-log.js";
import { findPreRevealLeaks } from "./leak-scan.js";
import { refused, SimulationError, STEP_TIMEOUT_MS, timed, withTimeout } from "./rpc.js";
import type { HostAccess } from "./setup.js";
import type { LatencyRecorder } from "./stats.js";

export type SimulatorSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SimulatedParticipant {
  number: number;
  cohort: Cohort;
  displayName: string;
  participantId: string;
  /** Secret proof of this place in the Room; never printed, scrubbed from every report. */
  resumeToken: string;
  socket: SimulatorSocket;
  log: EventLog;
}

/** Counts every payload checked for a pre-reveal disclosure and keeps the findings. */
export class SecrecyMonitor {
  scanned = 0;
  readonly leaks: string[] = [];

  inspect(label: string, payload: unknown): void {
    this.scanned += 1;
    for (const path of findPreRevealLeaks(payload)) this.leaks.push(`${label} ${path}`);
  }
}

export interface RoomSession {
  roomId: string;
  joinCode: string;
  host: { socket: SimulatorSocket; log: EventLog };
  participants: SimulatedParticipant[];
  lobby: LobbySnapshot;
  recorder: LatencyRecorder;
  secrecy: SecrecyMonitor;
  /** Drops a Participant's socket and opens a new one that feeds the same event log. */
  reconnect(participant: SimulatedParticipant): Promise<SimulatorSocket>;
  secretValues(): string[];
  close(): void;
}

export interface LobbyStageResult {
  connectedSockets: number;
  joinedParticipants: number;
  distinctParticipantIds: number;
  lobbyParticipants: number;
}

function connect(url: string, ticket: string | null): SimulatorSocket {
  return io(url, {
    forceNew: true,
    reconnection: false,
    timeout: STEP_TIMEOUT_MS,
    transports: ["websocket"],
    ...(ticket ? { auth: { ticket } } : {}),
  });
}

function awaitConnection(socket: SimulatorSocket, label: string): Promise<void> {
  const connected = new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", (error) =>
      reject(new SimulationError(`${label} could not connect: ${error.message}`)),
    );
  });
  return withTimeout(connected, `${label} connection`);
}

function listen(socket: SimulatorSocket, label: string, log: EventLog): void {
  socket.on("round:state", (payload) => log.recordRound(label, payload));
  socket.on("room:lobby", (payload) => {
    const parsed = lobbySnapshotSchema.safeParse(payload);
    if (parsed.success) log.recordLobby(label, parsed.data);
  });
  // Acknowledge server latency probes at once, as a browser does.
  socket.on("latency:ping", (_payload, acknowledge) => acknowledge());
}

function checkStarterFixture(lobby: LobbySnapshot): void {
  if (
    lobby.questionSetTitle !== STARTER_QUESTION_SET_TITLE ||
    lobby.questionCount !== STARTER_QUESTION_COUNT
  ) {
    throw new SimulationError(
      `Room is not the starter Question Set (${lobby.questionSetTitle}, ${lobby.questionCount} Questions)`,
    );
  }
  if (lobby.phase !== "LOBBY") {
    throw new SimulationError(`Room is in ${lobby.phase}, not a fresh LOBBY`);
  }
}

export function hostLobby(
  session: Pick<RoomSession, "host" | "roomId" | "recorder">,
  step: string,
) {
  return timed(
    session.recorder,
    "roomHostAck",
    (acknowledge) => session.host.socket.emit("room:host", { roomId: session.roomId }, acknowledge),
    (response) => {
      const parsed = roomHostResponseSchema.parse(response);
      return parsed.ok ? parsed.lobby : refused(step, parsed);
    },
    step,
  );
}

async function pingAndJoin(
  participant: Pick<SimulatedParticipant, "number" | "socket">,
  joinCode: string,
  displayName: string,
  recorder: LatencyRecorder,
): Promise<Extract<RoomJoinResponse, { ok: true }>> {
  const label = `Participant ${participant.number}`;
  await timed(
    recorder,
    "timePingAck",
    (acknowledge) =>
      participant.socket.emit("time:ping", { clientSentAt: Date.now() }, acknowledge),
    (response) => {
      const parsed = timePingResponseSchema.parse(response);
      if (!parsed.ok) throw new SimulationError(`${label} time:ping refused: ${parsed.error}`);
      return parsed;
    },
    `${label} time:ping`,
  );
  return timed(
    recorder,
    "roomJoinAck",
    (acknowledge) =>
      participant.socket.emit(
        "room:join",
        { joinCode, displayName, idempotencyKey: randomUUID() },
        acknowledge,
      ),
    (response) => {
      const parsed = roomJoinResponseSchema.parse(response);
      return parsed.ok ? parsed : refused(`${label} join`, parsed);
    },
    `${label} join`,
  );
}

/**
 * Connects the Host and N independent Guests to one fresh starter Room. The returned session keeps
 * every socket open; the caller must `close()` it on success and on failure.
 */
export async function openLobby(
  config: SimulatorConfig,
  access: HostAccess,
  recorder: LatencyRecorder,
): Promise<RoomSession> {
  const secrecy = new SecrecyMonitor();
  const sockets: SimulatorSocket[] = [];
  const close = () => {
    for (const socket of sockets) socket.disconnect();
  };

  try {
    const hostSocket = connect(config.gameServerUrl, access.hostTicket);
    sockets.push(hostSocket);
    const hostLog = new EventLog((label, payload) => secrecy.inspect(label, payload));
    listen(hostSocket, "Host", hostLog);
    await awaitConnection(hostSocket, "Host");

    const hostSession = {
      roomId: access.roomId,
      host: { socket: hostSocket, log: hostLog },
      recorder,
      secrecy,
    };
    const initial = await hostLobby(hostSession, "Host subscription");
    checkStarterFixture(initial);

    const numbers = Array.from({ length: config.participantCount }, (_, index) => index + 1);
    const participants = await Promise.all(
      numbers.map(async (number): Promise<SimulatedParticipant> => {
        const label = `Participant ${number}`;
        const socket = connect(config.gameServerUrl, null);
        sockets.push(socket);
        const log = new EventLog((from, payload) => secrecy.inspect(from, payload));
        listen(socket, label, log);
        await awaitConnection(socket, label);
        const displayName = `Sim Player ${String(number).padStart(2, "0")}`;
        const joined = await pingAndJoin(
          { number, socket },
          initial.joinCode,
          displayName,
          recorder,
        );
        secrecy.inspect(`${label} join ack`, joined);
        return {
          number,
          cohort: cohortOf(number),
          displayName,
          participantId: joined.participant.participantId,
          resumeToken: joined.resumeToken,
          socket,
          log,
        };
      }),
    );

    const lobby = await hostLobby(hostSession, "Host Lobby check");
    const reconnect = async (participant: SimulatedParticipant) => {
      participant.socket.disconnect();
      const label = `Participant ${participant.number}`;
      const socket = connect(config.gameServerUrl, null);
      sockets.push(socket);
      listen(socket, label, participant.log);
      await awaitConnection(socket, label);
      participant.socket = socket;
      return socket;
    };
    return {
      ...hostSession,
      joinCode: initial.joinCode,
      participants,
      lobby,
      reconnect,
      secretValues: () => participants.map((participant) => participant.resumeToken),
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}

export function summarizeLobby(session: RoomSession, expected: number): LobbyStageResult {
  const joinedIds = new Set(session.participants.map((participant) => participant.participantId));
  const lobbyIds = new Set(
    session.lobby.participants.map((participant) => participant.participantId),
  );
  if (
    joinedIds.size !== expected ||
    session.lobby.participants.length !== expected ||
    lobbyIds.size !== expected ||
    ![...joinedIds].every((id) => lobbyIds.has(id))
  ) {
    throw new SimulationError(
      `Lobby shows ${session.lobby.participants.length} Participants (${lobbyIds.size} distinct); expected ${expected} matching the joins`,
    );
  }
  return {
    connectedSockets: session.participants.length,
    joinedParticipants: session.participants.length,
    distinctParticipantIds: joinedIds.size,
    lobbyParticipants: session.lobby.participants.length,
  };
}
