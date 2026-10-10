import { medianRoundTrip } from "@aptiquiz/game-engine";
import type { GameSocket } from "./game-socket.js";

export interface LatencySamplingPolicy {
  /** Time between two pings to one socket. */
  readonly intervalMs: number;
  /** Most recent acknowledged samples kept per socket. */
  readonly windowSize: number;
  /** A ping not acknowledged within this time is not a sample. */
  readonly timeoutMs: number;
}

/**
 * Measures each Participant socket's round trip with server-initiated pings, so delay
 * compensation never depends on browser clocks.
 */
export interface LatencySampler {
  /** Starts sampling a socket now; repeated calls for one socket keep a single timer. */
  track(socket: GameSocket): void;
  /** Median of the socket's current window, or null without an acknowledged sample. */
  medianRoundTripMs(socketId: string): number | null;
}

export function createLatencySampler(
  policy: LatencySamplingPolicy,
  now: () => number,
): LatencySampler {
  const windows = new Map<string, number[]>();

  function track(socket: GameSocket): void {
    if (windows.has(socket.id) || socket.disconnected) {
      return;
    }

    const samples: number[] = [];
    windows.set(socket.id, samples);
    const sample = () => void measure(socket, samples);
    const timer = setInterval(sample, policy.intervalMs);
    socket.once("disconnect", () => {
      clearInterval(timer);
      windows.delete(socket.id);
    });
    sample();
  }

  async function measure(socket: GameSocket, samples: number[]): Promise<void> {
    const serverSentAt = now();

    try {
      await socket.timeout(policy.timeoutMs).emitWithAck("latency:ping", { serverSentAt });
    } catch {
      return;
    }

    samples.push(now() - serverSentAt);

    if (samples.length > policy.windowSize) {
      samples.shift();
    }
  }

  function medianRoundTripMs(socketId: string): number | null {
    return medianRoundTrip(windows.get(socketId) ?? []);
  }

  return { track, medianRoundTripMs };
}
