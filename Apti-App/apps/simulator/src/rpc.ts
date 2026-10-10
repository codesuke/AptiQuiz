import type { LatencyRecorder } from "./stats.js";

export const STEP_TIMEOUT_MS = 10_000;

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

export function withTimeout<T>(promise: Promise<T>, step: string, timeoutMs = STEP_TIMEOUT_MS) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new SimulationError(`${step} did not finish within ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Sends one command, records its client-observed acknowledgement round trip, and parses it. */
export async function timed<T>(
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

export function refused(step: string, response: { ok: false; error: string }): never {
  throw new SimulationError(`${step} was refused: ${response.error}`);
}
