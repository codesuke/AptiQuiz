import { MAX_ROOM_PARTICIPANTS, roomCodeSchema } from "@aptiquiz/contracts";
import { ConfigError, readHttpUrl } from "./config.js";

const DEFAULT_BOT_COUNT = 10;
const DEFAULT_MAX_ANSWER_DELAY_MS = 8_000;
const DEFAULT_SKIP_PERCENT = 10;
/** A person drives the Host screen, so the bots wait much longer than the automated run. */
const DEFAULT_WAIT_MS = 15 * 60_000;

export interface BotsConfig {
  gameServerUrl: string;
  joinCode: string;
  botCount: number;
  maxAnswerDelayMs: number;
  /** Share of Participant-Rounds a bot leaves unanswered, so reveals include unanswered cases. */
  skipPercent: number;
  waitMs: number;
}

type Environment = Readonly<Record<string, string | undefined>>;

function readInteger(env: Environment, name: string, fallback: number, min: number, max: number) {
  const value = env[name];
  if (value === undefined) return fallback;
  const parsed = /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ConfigError(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

export function readBotsConfig(env: Environment): BotsConfig {
  const code = roomCodeSchema.safeParse(env.SIMULATOR_JOIN_CODE ?? "");
  if (!code.success) {
    throw new ConfigError("Set SIMULATOR_JOIN_CODE to the Join Code of a Room in its Lobby");
  }
  return {
    gameServerUrl: readHttpUrl(
      "SIMULATOR_URL",
      env.SIMULATOR_URL ?? "https://game.aptiquiz.codesuke.in",
    ),
    joinCode: code.data,
    botCount: readInteger(env, "SIMULATED_PLAYERS", DEFAULT_BOT_COUNT, 1, MAX_ROOM_PARTICIPANTS),
    maxAnswerDelayMs: readInteger(
      env,
      "BOT_MAX_ANSWER_DELAY_MS",
      DEFAULT_MAX_ANSWER_DELAY_MS,
      0,
      60_000,
    ),
    skipPercent: readInteger(env, "BOT_SKIP_PERCENT", DEFAULT_SKIP_PERCENT, 0, 100),
    waitMs: readInteger(env, "BOT_WAIT_MS", DEFAULT_WAIT_MS, 10_000, 2 * 60 * 60_000),
  };
}
