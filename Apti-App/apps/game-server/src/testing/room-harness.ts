import { randomUUID } from "node:crypto";
import {
  type ClientToServerEvents,
  ROOM_REGISTRATION_PATH,
  type RoomRegistration,
  type RoundView,
  type ServerToClientEvents,
  type SocketTicketSubject,
} from "@aptiquiz/contracts";
import { issueRoomRegistration, issueSocketTicket } from "@aptiquiz/socket-ticket";
import pino from "pino";
import { io, type Socket, type Socket as UntypedSocket } from "socket.io-client";
import { expect } from "vitest";
import { type GameServerConfig, readGameServerConfig } from "../config.js";
import type { RoomStore } from "../room-store.js";
import type { RoomRegistry } from "../rooms.js";
import type { Schedule } from "../scheduler.js";
import { createConfiguredRegistry, createGameServer, type RunningGameServer } from "../server.js";
import { createInMemoryRoomStore, type InMemoryRoomStore } from "./in-memory-room-store.js";

export const gameServerSecret = "test-secret-with-at-least-32-characters";
export const SILENCE_WINDOW_MS = 150;
export const TEST_ROUND_DURATION_MS = 5_000;
export const ROUND_OPENED_AT = 1_800_000_000_000;
export const TEST_READY_DURATION_MS = 3_000;
export const ROOM_STARTED_AT = ROUND_OPENED_AT - TEST_READY_DURATION_MS;
/** Long enough that a test only ever sees the first latency sample of a socket. */
const TEST_LATENCY_INTERVAL_MS = 60_000;
const TEST_LATENCY_TIMEOUT_MS = 100;

export const hostUser: SocketTicketSubject = {
  userId: "host_user",
  role: "user",
  homeCollegeId: "college_room",
  emailVerified: true,
};
export const otherUser: SocketTicketSubject = {
  userId: "other_user",
  role: "user",
  homeCollegeId: "college_other",
  emailVerified: false,
};

export const roomA: RoomRegistration = {
  roomId: "room_a",
  joinCode: "ABC234",
  hostUserId: hostUser.userId,
  college: { id: "college_room", name: "Room College" },
  questionSetTitle: "Aptitude Basics",
  questions: [
    {
      text: "2 + 2?",
      options: [
        { id: "a", text: "3" },
        { id: "b", text: "4" },
      ],
      correctOptionId: "b",
      topic: "Arithmetic",
      difficulty: "EASY",
    },
  ],
};
export const roomB: RoomRegistration = { ...roomA, roomId: "room_b", joinCode: "XYZ789" };
export const sixOptionQuestion = {
  text: "Which number is prime?",
  options: [
    { id: "opt_1", text: "4" },
    { id: "opt_2", text: "6" },
    { id: "opt_3", text: "7" },
    { id: "opt_4", text: "8" },
    { id: "opt_5", text: "9" },
    { id: "opt_6", text: "10" },
  ],
  correctOptionId: "opt_3",
  topic: "Numbers",
  difficulty: "MEDIUM",
  media: { kind: "none" },
} as const satisfies RoomRegistration["questions"][number];
export const roundRoom: RoomRegistration = {
  ...roomA,
  roomId: "room_round",
  joinCode: "RND234",
  questions: [sixOptionQuestion, ...roomA.questions],
};

export type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface TestClock {
  readonly now: () => number;
  advance(milliseconds: number): void;
}

/** Holds scheduled callbacks until a test fires the ones the test clock has reached. */
export interface TestScheduler {
  readonly schedule: Schedule;
  /** Runs every callback due at the current test time; callbacks they schedule wait. */
  fireDue(): void;
  /** Snapshot callbacks so tests can replay a stale delivery after a later Round opens. */
  callbacks(): readonly { readonly at: number; readonly callback: () => void }[];
}

export interface TestServer<Store extends RoomStore = InMemoryRoomStore> {
  readonly port: number;
  readonly store: Store;
  readonly clock: TestClock;
  /** The Round deadline timers; nothing fires until the test calls `fireDue`. */
  readonly deadlines: TestScheduler;
  /** The server's own registry, so tests can read what stays internal before the reveal. */
  readonly registry: RoomRegistry;
}

export interface TestServerOptions {
  readonly logger?: pino.Logger;
  readonly config?: Partial<GameServerConfig>;
}

function createTestClock(start: number): TestClock {
  let current = start;
  return {
    now: () => current,
    advance: (milliseconds) => {
      current += milliseconds;
    },
  };
}

function createTestScheduler(clock: TestClock): TestScheduler {
  const pending = new Set<{ readonly at: number; readonly callback: () => void }>();

  return {
    schedule: (at, callback) => {
      const entry = { at, callback };
      pending.add(entry);
      return () => pending.delete(entry);
    },
    fireDue: () => {
      const due = [...pending].filter((entry) => entry.at <= clock.now());

      for (const entry of due) {
        pending.delete(entry);
        entry.callback();
      }
    },
    callbacks: () => [...pending],
  };
}

let server: RunningGameServer | undefined;
let activeClock: TestClock | undefined;
let activeDeadlines: TestScheduler | undefined;
const openSockets: TestSocket[] = [];

/** Disconnects every test socket and stops the running server; call it after each test. */
export async function stopTestServer(): Promise<void> {
  for (const socket of openSockets.splice(0)) {
    socket.disconnect();
  }
  await server?.close();
  server = undefined;
  activeClock = undefined;
  activeDeadlines = undefined;
}

function testConfig(overrides: Partial<GameServerConfig> = {}): GameServerConfig {
  const defaults = readGameServerConfig({
    GAME_SERVER_SECRET: gameServerSecret,
    DATABASE_URL: "postgresql://unused",
  });
  return {
    ...defaults,
    port: 0,
    logLevel: "silent",
    roundDurationMs: TEST_ROUND_DURATION_MS,
    latencySampling: {
      ...defaults.latencySampling,
      intervalMs: TEST_LATENCY_INTERVAL_MS,
      timeoutMs: TEST_LATENCY_TIMEOUT_MS,
    },
    ...overrides,
  };
}

export function startServer(options: TestServerOptions = {}): Promise<TestServer> {
  return startServerWithStore(createInMemoryRoomStore(), options);
}

/** Starts the server on a store of the test's choice, such as a real PostgreSQL one. */
export async function startServerWithStore<Store extends RoomStore>(
  store: Store,
  options: TestServerOptions = {},
): Promise<TestServer<Store>> {
  const { logger = pino({ level: "silent" }) } = options;
  const config = testConfig(options.config);
  const clock = createTestClock(ROOM_STARTED_AT);
  const deadlines = createTestScheduler(clock);
  activeClock = clock;
  activeDeadlines = deadlines;
  const registry = createConfiguredRegistry(config, {
    store,
    logger,
    now: clock.now,
    schedule: deadlines.schedule,
  });
  server = createGameServer(config, { logger, roomStore: store, now: clock.now, registry });
  return { port: await server.listen(), store, clock, deadlines, registry };
}

export function postRegistration(port: number, body: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}${ROOM_REGISTRATION_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

export async function registerRoom(
  port: number,
  registration: RoomRegistration,
  secret = gameServerSecret,
  issuedAt = Date.now(),
): Promise<Response> {
  const token = await issueRoomRegistration(registration, secret, issuedAt);
  return postRegistration(port, JSON.stringify({ registration: token }));
}

export async function startWithRooms(...registrations: RoomRegistration[]): Promise<TestServer> {
  return startServerWithRooms({}, ...registrations);
}

export async function startServerWithRooms(
  options: TestServerOptions,
  ...registrations: RoomRegistration[]
): Promise<TestServer> {
  const testServer = await startServer(options);
  for (const registration of registrations) {
    expect((await registerRoom(testServer.port, registration)).status).toBe(200);
  }
  return testServer;
}

export async function connectAs(port: number, user?: SocketTicketSubject): Promise<TestSocket> {
  const ticket =
    user === undefined ? undefined : await issueSocketTicket(user, gameServerSecret, Date.now());
  const socket: TestSocket = io(`http://127.0.0.1:${port}`, {
    auth: ticket === undefined ? {} : { ticket },
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  openSockets.push(socket);

  await new Promise<void>((resolve, reject) => {
    socket.once("server:ready", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

export function join(
  socket: TestSocket,
  displayName: string,
  joinCode = roomA.joinCode,
  key: string = randomUUID(),
) {
  return socket.emitWithAck("room:join", { joinCode, displayName, idempotencyKey: key });
}

export function nextRound(socket: TestSocket): Promise<RoundView> {
  return new Promise((resolve) => socket.once("round:state", resolve));
}

/** Most existing Round tests begin after the new three-second ready phase. */
export async function startRoom(host: TestSocket, roomId = roomA.roomId, key = randomUUID()) {
  const result = await host.emitWithAck("room:start", { roomId, idempotencyKey: key });
  if (result.ok && result.lobby.ready && activeClock && activeDeadlines) {
    activeClock.advance(Math.max(0, result.lobby.ready.endsAt - activeClock.now()));
    activeDeadlines.fireDue();
  }
  return result;
}

export async function hostRoom(port: number, roomId: string): Promise<TestSocket> {
  const host = await connectAs(port, hostUser);
  await expect(host.emitWithAck("room:host", { roomId })).resolves.toMatchObject({ ok: true });
  return host;
}

/** Records every server event the sockets receive into one list, for leak checks. */
export function recordEveryEvent(sockets: readonly TestSocket[], received: unknown[]): void {
  for (const socket of sockets) {
    socket.onAny((_event, ...payload) => received.push(payload));
  }
}

export function findFieldPaths(value: unknown, fields: readonly string[], path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findFieldPaths(item, fields, `${path}[${index}]`));
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => [
    ...(fields.includes(key) ? [`${path}.${key}`] : []),
    ...findFieldPaths(child, fields, `${path}.${key}`),
  ]);
}

/** Emits like a client that forgot the acknowledgement callback. */
export function emitWithoutAck(socket: TestSocket, event: string, payload: unknown): void {
  (socket as unknown as UntypedSocket).emit(event, payload);
}

export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SILENCE_WINDOW_MS));
}
