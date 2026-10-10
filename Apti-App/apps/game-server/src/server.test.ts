import type { ClientToServerEvents, ServerReady, ServerToClientEvents } from "@aptiquiz/contracts";
import { issueSocketTicket, SOCKET_TICKET_LIFETIME_MS } from "@aptiquiz/socket-ticket";
import pino from "pino";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_EVENT_RATE_LIMIT, readGameServerConfig } from "./config.js";
import { createGameServer, type RunningGameServer } from "./server.js";
import { createInMemoryRoomStore } from "./testing/in-memory-room-store.js";

const ONE_SECOND_MS = 1_000;
const FIXED_SERVER_TIME = 1_800_000_000_000;
const gameServerSecret = "test-secret-with-at-least-32-characters";
const verifiedAdmin = {
  userId: "user_123",
  role: "admin",
  homeCollegeId: null,
  emailVerified: true,
} as const;

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type HandshakeOutcome =
  | { readonly connected: true; readonly ready: ServerReady }
  | { readonly connected: false; readonly error: string };

let server: RunningGameServer | undefined;
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) {
    socket.disconnect();
  }
  await server?.close();
  server = undefined;
});

async function startServer(now?: () => number): Promise<number> {
  server = createGameServer(
    {
      ...readGameServerConfig({ GAME_SERVER_SECRET: gameServerSecret, DATABASE_URL: "unused" }),
      port: 0,
      logLevel: "silent",
    },
    { logger: pino({ level: "silent" }), roomStore: createInMemoryRoomStore(), now },
  );
  return server.listen();
}

function connect(port: number, auth: Record<string, unknown>): Promise<HandshakeOutcome> {
  const socket: TestSocket = io(`http://127.0.0.1:${port}`, {
    auth,
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  openSockets.push(socket);

  return new Promise((resolve) => {
    socket.once("server:ready", (ready) => resolve({ connected: true, ready }));
    socket.once("connect_error", (error) => resolve({ connected: false, error: error.message }));
  });
}

describe("game server", () => {
  it("reports readiness without exposing game state", async () => {
    const port = await startServer();
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("reports time from the server clock", async () => {
    const port = await startServer(() => FIXED_SERVER_TIME);
    const outcome = await connect(port, {});
    const socket = openSockets.at(-1);
    const pong = await socket?.emitWithAck("time:ping", { clientSentAt: 1 });

    expect(outcome).toMatchObject({ connected: true, ready: { serverTime: FIXED_SERVER_TIME } });
    expect(pong).toEqual({ ok: true, clientSentAt: 1, serverReceivedAt: FIXED_SERVER_TIME });
  });

  it("disconnects a socket that floods events faster than the rate limit", async () => {
    const port = await startServer(() => FIXED_SERVER_TIME);
    await connect(port, {});
    const socket = openSockets.at(-1);
    const disconnected = new Promise<string>((resolve) => socket?.once("disconnect", resolve));

    for (let event = 0; event <= DEFAULT_EVENT_RATE_LIMIT.burst; event += 1) {
      socket?.emit("time:ping", { clientSentAt: event }, () => {});
    }

    await expect(disconnected).resolves.toBe("io server disconnect");
  });
});

describe("game server handshake", () => {
  it("identifies a connection with a valid Socket Ticket as its User", async () => {
    const port = await startServer();
    const ticket = await issueSocketTicket(verifiedAdmin, gameServerSecret, Date.now());

    await expect(connect(port, { ticket })).resolves.toMatchObject({
      connected: true,
      ready: {
        identity: { kind: "user", userId: "user_123", role: "admin", emailVerified: true },
      },
    });
  });

  it("identifies a connection without a Socket Ticket as a Guest", async () => {
    const port = await startServer();

    await expect(connect(port, {})).resolves.toMatchObject({
      connected: true,
      ready: { identity: { kind: "guest" } },
    });
  });

  it("refuses an expired Socket Ticket", async () => {
    const port = await startServer();
    const longAgo = Date.now() - SOCKET_TICKET_LIFETIME_MS * 2;
    const ticket = await issueSocketTicket(verifiedAdmin, gameServerSecret, longAgo);

    await expect(connect(port, { ticket })).resolves.toEqual({
      connected: false,
      error: "socket_ticket_expired",
    });
  });

  it("refuses a Socket Ticket signed with another secret", async () => {
    const port = await startServer();
    const ticket = await issueSocketTicket(
      verifiedAdmin,
      "another-secret-with-32-characters!!",
      Date.now(),
    );

    await expect(connect(port, { ticket })).resolves.toEqual({
      connected: false,
      error: "socket_ticket_invalid",
    });
  });

  it("refuses a Socket Ticket whose claims were altered", async () => {
    const port = await startServer();
    const ticket = await issueSocketTicket(
      { ...verifiedAdmin, role: "user" },
      gameServerSecret,
      Date.now(),
    );
    const [header, payload, signature] = ticket.split(".");
    const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
    const forgedPayload = Buffer.from(JSON.stringify({ ...claims, role: "admin" })).toString(
      "base64url",
    );

    await expect(
      connect(port, { ticket: `${header}.${forgedPayload}.${signature}` }),
    ).resolves.toEqual({ connected: false, error: "socket_ticket_invalid" });
  });

  it("refuses a Socket Ticket issued for another audience", async () => {
    const port = await startServer();
    const { SignJWT } = await import("jose");
    const nowSeconds = Math.floor(Date.now() / ONE_SECOND_MS);
    const ticket = await new SignJWT({ role: "user", homeCollegeId: null, emailVerified: true })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setAudience("another-service")
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + SOCKET_TICKET_LIFETIME_MS / ONE_SECOND_MS)
      .sign(new TextEncoder().encode(gameServerSecret));

    await expect(connect(port, { ticket })).resolves.toEqual({
      connected: false,
      error: "socket_ticket_invalid",
    });
  });

  it.each([
    ["a malformed ticket", { ticket: "not-a-jwt" }],
    ["an empty ticket", { ticket: "" }],
    ["a non-string ticket", { ticket: 42 }],
  ])("refuses %s instead of treating it as a Guest", async (_label, auth) => {
    const port = await startServer();

    await expect(connect(port, auth)).resolves.toEqual({
      connected: false,
      error: "socket_ticket_invalid",
    });
  });
});
