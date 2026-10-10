import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TimePingResponse,
} from "@aptiquiz/contracts";
import { io, type Socket } from "socket.io-client";

const targetUrl = process.env.SIMULATOR_URL ?? "http://localhost:3001";
const playerCount = readPlayerCount(process.env.SIMULATED_PLAYERS);
const connectionTimeoutMs = 10_000;

type SimulatorSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const results = await Promise.all(
  Array.from({ length: playerCount }, (_, index) => connectPlayer(index + 1)),
);

const latencies = results.map((result) => result.roundTripMs).sort((left, right) => left - right);
const report = {
  targetUrl,
  requestedPlayers: playerCount,
  connectedPlayers: results.length,
  roundTripMs: {
    minimum: latencies[0] ?? null,
    median: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    maximum: latencies.at(-1) ?? null,
  },
};

console.log(JSON.stringify(report, null, 2));

async function connectPlayer(playerNumber: number): Promise<{ roundTripMs: number }> {
  const socket: SimulatorSocket = io(targetUrl, {
    forceNew: true,
    reconnection: false,
    timeout: connectionTimeoutMs,
    transports: ["websocket"],
  });

  try {
    await waitForConnection(socket, playerNumber);
    const clientSentAt = Date.now();
    const response = await emitTimePing(socket, clientSentAt);

    if (!response.ok) {
      throw new Error(`Player ${playerNumber} received ${response.error}`);
    }

    return { roundTripMs: Date.now() - clientSentAt };
  } finally {
    socket.disconnect();
  }
}

function waitForConnection(socket: SimulatorSocket, playerNumber: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Player ${playerNumber} did not connect within ${connectionTimeoutMs}ms`));
    }, connectionTimeoutMs);

    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function emitTimePing(socket: SimulatorSocket, clientSentAt: number): Promise<TimePingResponse> {
  return new Promise((resolve) => {
    socket.emit("time:ping", { clientSentAt }, resolve);
  });
}

function readPlayerCount(value: string | undefined): number {
  const parsed = value === undefined ? 50 : Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error("SIMULATED_PLAYERS must be an integer from 1 to 500");
  }

  return parsed;
}

function percentile(sortedValues: readonly number[], percentileValue: number): number | null {
  if (sortedValues.length === 0) {
    return null;
  }

  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)] ?? null;
}
