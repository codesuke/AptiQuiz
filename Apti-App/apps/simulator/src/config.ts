import { MAX_ROOM_PARTICIPANTS } from "@aptiquiz/contracts";

export const STARTER_QUESTION_SET_ID = "starter-aptitude-practice";
export const STARTER_QUESTION_SET_TITLE = "Starter aptitude practice";
export const STARTER_QUESTION_COUNT = 3;

const DEFAULT_PARTICIPANT_COUNT = 50;
const DEFAULT_GAME_SERVER_URL = "http://localhost:3001";
const DEFAULT_WEB_URL = "http://localhost:3000";

export type RoomSetup =
  /** Create a fresh starter Room through the web application as a signed-in Host. */
  | { kind: "web"; webUrl: string; hostCookie: string }
  /** Use a Room and a fresh Host Socket Ticket that were created beforehand. */
  | { kind: "supplied"; roomId: string; hostTicket: string };

export interface SimulatorConfig {
  gameServerUrl: string;
  participantCount: number;
  setup: RoomSetup;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

type Environment = Readonly<Record<string, string | undefined>>;

function readParticipantCount(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PARTICIPANT_COUNT;
  const parsed = /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ROOM_PARTICIPANTS) {
    throw new ConfigError(
      `SIMULATED_PLAYERS must be an integer from 1 to ${MAX_ROOM_PARTICIPANTS}`,
    );
  }
  return parsed;
}

export function readHttpUrl(name: string, value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // Reported below without echoing the value, which may carry credentials.
  }
  throw new ConfigError(`${name} must be an http(s) URL`);
}

function readSetup(env: Environment): RoomSetup {
  const roomId = env.SIMULATOR_ROOM_ID;
  const hostTicket = env.SIMULATOR_HOST_TICKET;
  if (roomId || hostTicket) {
    if (!roomId || !hostTicket) {
      throw new ConfigError("SIMULATOR_ROOM_ID and SIMULATOR_HOST_TICKET must be set together");
    }
    return { kind: "supplied", roomId, hostTicket };
  }

  const hostCookie = env.SIMULATOR_HOST_COOKIE;
  if (!hostCookie) {
    throw new ConfigError(
      "Set SIMULATOR_HOST_COOKIE (signed-in Host session) or SIMULATOR_ROOM_ID with SIMULATOR_HOST_TICKET",
    );
  }
  return {
    kind: "web",
    webUrl: readHttpUrl("SIMULATOR_WEB_URL", env.SIMULATOR_WEB_URL ?? DEFAULT_WEB_URL),
    hostCookie,
  };
}

export function readConfig(env: Environment): SimulatorConfig {
  return {
    gameServerUrl: readHttpUrl("SIMULATOR_URL", env.SIMULATOR_URL ?? DEFAULT_GAME_SERVER_URL),
    participantCount: readParticipantCount(env.SIMULATED_PLAYERS),
    setup: readSetup(env),
  };
}

/** Every secret value the run holds, so a report can be scrubbed before printing. */
export function secretsOf(config: SimulatorConfig): string[] {
  return config.setup.kind === "web" ? [config.setup.hostCookie] : [config.setup.hostTicket];
}
