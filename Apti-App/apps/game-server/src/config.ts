import type { EventRateLimitPolicy } from "./event-rate-limit.js";
import type { LatencySamplingPolicy } from "./latency-sampler.js";

const DEFAULT_PORT = 3001;
const DEFAULT_WEB_ORIGIN = "http://localhost:3000";
const MINIMUM_SECRET_LENGTH = 32;
/** PRD #5: every Round closes 30 seconds after it opens. */
export const DEFAULT_ROUND_DURATION_MS = 30_000;
/** PRD #5: scoring subtracts at most 100 ms of one-way network delay. */
export const DEFAULT_MAX_DELAY_COMPENSATION_MS = 100;
/** PRD #5: Effective Response Times are floored to 100 ms before scoring. */
export const DEFAULT_SCORE_BUCKET_MS = 100;
/**
 * PRD #6: a Participant whose last socket drops during an open Round still counts as connected
 * for early Round closure this long, so a browser refresh does not end the Question for everyone.
 */
export const DEFAULT_RECONNECT_GRACE_MS = 5_000;
/** Server-initiated pings: one every 2 s, the last 5 acknowledged, each given 2 s to return. */
export const DEFAULT_LATENCY_SAMPLING: LatencySamplingPolicy = {
  intervalMs: 2_000,
  windowSize: 5,
  timeoutMs: 2_000,
};

/**
 * A player sends a few events per Question; a socket that exceeds this budget is flooding the
 * server and is disconnected. Its Participant can still resume with the Resume Token.
 */
export const DEFAULT_EVENT_RATE_LIMIT: EventRateLimitPolicy = {
  burst: 30,
  refillPerSecond: 10,
};

export interface GameServerConfig {
  readonly port: number;
  readonly webOrigin: string;
  readonly logLevel: string;
  readonly gameServerSecret: string;
  readonly databaseUrl: string;
  readonly roundDurationMs: number;
  readonly maxDelayCompensationMs: number;
  readonly scoreBucketMs: number;
  readonly latencySampling: LatencySamplingPolicy;
  readonly reconnectGraceMs: number;
  readonly eventRateLimit: EventRateLimitPolicy;
}

export function readGameServerConfig(environment: NodeJS.ProcessEnv): GameServerConfig {
  const configuredPort = environment.GAME_SERVER_PORT;
  const port = configuredPort === undefined ? DEFAULT_PORT : Number.parseInt(configuredPort, 10);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("GAME_SERVER_PORT must be an integer between 0 and 65535");
  }

  return {
    port,
    webOrigin: environment.GAME_SERVER_ORIGIN ?? DEFAULT_WEB_ORIGIN,
    logLevel: environment.LOG_LEVEL ?? "info",
    gameServerSecret: readGameServerSecret(environment.GAME_SERVER_SECRET),
    databaseUrl: readDatabaseUrl(environment.DATABASE_URL),
    roundDurationMs: DEFAULT_ROUND_DURATION_MS,
    maxDelayCompensationMs: DEFAULT_MAX_DELAY_COMPENSATION_MS,
    scoreBucketMs: DEFAULT_SCORE_BUCKET_MS,
    latencySampling: DEFAULT_LATENCY_SAMPLING,
    reconnectGraceMs: DEFAULT_RECONNECT_GRACE_MS,
    eventRateLimit: DEFAULT_EVENT_RATE_LIMIT,
  };
}

function readGameServerSecret(secret: string | undefined): string {
  if (secret === undefined || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`GAME_SERVER_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters`);
  }

  return secret;
}

function readDatabaseUrl(databaseUrl: string | undefined): string {
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required to record Room Participants");
  }

  return databaseUrl;
}
