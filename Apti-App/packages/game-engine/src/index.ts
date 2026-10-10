export {
  type MatchParticipant,
  type MatchSummaryInput,
  type ParticipantSummary,
  type ResultAnswer,
  summarizeMatch,
  type TopicTally,
} from "./results.js";
export {
  type AnswerTiming,
  calculateScore,
  effectiveResponseTime,
  isAnswerOnTime,
  medianRoundTrip,
  type RoundWindow,
  type ScoredAnswer,
  scoreAnswer,
  type TimingPolicy,
} from "./scoring.js";
export { type RankedStanding, rankStandings, type Standing } from "./standings.js";

export const gamePhases = [
  "LOBBY",
  "GETTING_READY",
  "QUESTION_OPEN",
  "QUESTION_REVEAL",
  "LEADERBOARD",
  "FINALIZING_RESULTS",
  "FINISHED",
] as const;

export type GamePhase = (typeof gamePhases)[number];

export interface GameState {
  readonly roomId: string;
  readonly phase: GamePhase;
  readonly questionCount: number;
  readonly questionIndex: number | null;
  readonly roundStartsAt: number | null;
  readonly roundEndsAt: number | null;
  /** Server time the current Question closed, or null while it is open or none exists. */
  readonly roundClosedAt: number | null;
  readonly readyEndsAt: number | null;
}

export type GameCommand =
  | { readonly type: "START"; readonly durationMs: number; readonly readyDurationMs?: number }
  | { readonly type: "OPEN_READY_QUESTION"; readonly durationMs: number }
  | { readonly type: "CLOSE_QUESTION" }
  | { readonly type: "SHOW_LEADERBOARD" }
  | { readonly type: "COMPLETE" }
  | { readonly type: "ADVANCE"; readonly durationMs: number; readonly readyDurationMs?: number };

export type GameEvent =
  | { readonly type: "QUESTION_OPENED"; readonly questionIndex: number }
  | { readonly type: "QUESTION_CLOSED"; readonly questionIndex: number }
  | { readonly type: "LEADERBOARD_SHOWN" }
  | { readonly type: "GAME_FINISHED" };

export interface TransitionResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function createGameState(roomId: string, questionCount: number): GameState {
  if (roomId.length === 0) {
    throw new Error("roomId is required");
  }

  if (!Number.isInteger(questionCount) || questionCount < 1) {
    throw new Error("questionCount must be a positive integer");
  }

  return {
    roomId,
    phase: "LOBBY",
    questionCount,
    questionIndex: null,
    roundStartsAt: null,
    roundEndsAt: null,
    roundClosedAt: null,
    readyEndsAt: null,
  };
}

/** The Host advances straight after a reveal, or after an optional Leaderboard. */
const ADVANCEABLE_PHASES: readonly GamePhase[] = ["QUESTION_REVEAL", "LEADERBOARD"];

export function transitionGame(
  state: GameState,
  command: GameCommand,
  serverTime: number,
): TransitionResult {
  assertTimestamp(serverTime);

  switch (command.type) {
    case "START":
      assertPhase(state, ["LOBBY"], command.type);
      if (command.readyDurationMs !== undefined) {
        assertDuration(command.readyDurationMs);
        return {
          state: {
            ...state,
            phase: "GETTING_READY",
            questionIndex: 0,
            readyEndsAt: serverTime + command.readyDurationMs,
          },
          events: [],
        };
      }
      return openQuestion(state, 0, command.durationMs, serverTime);
    case "OPEN_READY_QUESTION":
      assertPhase(state, ["GETTING_READY"], command.type);
      return openQuestion(state, requireQuestionIndex(state), command.durationMs, serverTime);
    case "CLOSE_QUESTION":
      assertPhase(state, ["QUESTION_OPEN"], command.type);
      return {
        state: { ...state, phase: "QUESTION_REVEAL", roundClosedAt: serverTime },
        events: [{ type: "QUESTION_CLOSED", questionIndex: requireQuestionIndex(state) }],
      };
    case "SHOW_LEADERBOARD":
      assertPhase(state, ["QUESTION_REVEAL"], command.type);
      return {
        state: { ...state, phase: "LEADERBOARD" },
        events: [{ type: "LEADERBOARD_SHOWN" }],
      };
    case "COMPLETE":
      assertPhase(state, ["FINALIZING_RESULTS"], command.type);
      return { state: { ...state, phase: "FINISHED" }, events: [{ type: "GAME_FINISHED" }] };
    case "ADVANCE": {
      assertPhase(state, ADVANCEABLE_PHASES, command.type);
      const nextQuestionIndex = requireQuestionIndex(state) + 1;

      if (nextQuestionIndex >= state.questionCount) {
        return {
          state: {
            ...state,
            phase: "FINALIZING_RESULTS",
            roundStartsAt: null,
            roundEndsAt: null,
            roundClosedAt: null,
          },
          events: [],
        };
      }

      if (command.readyDurationMs !== undefined) {
        assertDuration(command.readyDurationMs);
        return {
          state: {
            ...state,
            phase: "GETTING_READY",
            questionIndex: nextQuestionIndex,
            readyEndsAt: serverTime + command.readyDurationMs,
            roundStartsAt: null,
            roundEndsAt: null,
            roundClosedAt: null,
          },
          events: [],
        };
      }
      return openQuestion(state, nextQuestionIndex, command.durationMs, serverTime);
    }
  }
}

/**
 * Deterministic shuffle: the same seed always gives the same order, so a Participant keeps
 * one option order for a Round across reconnects without the server storing it.
 */
export function orderOptions<T>(options: readonly T[], seed: string): T[] {
  const ordered = [...options];
  const nextRandom = seededRandom(hashSeed(seed));

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    const current = ordered[index];
    const swapped = ordered[swapIndex];

    if (current !== undefined && swapped !== undefined) {
      ordered[index] = swapped;
      ordered[swapIndex] = current;
    }
  }

  return ordered;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;

/** 32-bit FNV-1a hash of the seed text. */
function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}

/** Mulberry32: a small PRNG that returns values in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function openQuestion(
  state: GameState,
  questionIndex: number,
  durationMs: number,
  serverTime: number,
): TransitionResult {
  assertDuration(durationMs);

  return {
    state: {
      ...state,
      phase: "QUESTION_OPEN",
      questionIndex,
      roundStartsAt: serverTime,
      roundEndsAt: serverTime + durationMs,
      roundClosedAt: null,
      readyEndsAt: null,
    },
    events: [{ type: "QUESTION_OPENED", questionIndex }],
  };
}

function assertDuration(durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("durationMs must be greater than zero");
  }
}

function assertTimestamp(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("serverTime must be a non-negative number");
  }
}

function assertPhase(
  state: GameState,
  allowed: readonly GamePhase[],
  command: GameCommand["type"],
): void {
  if (!allowed.includes(state.phase)) {
    throw new Error(`${command} is not allowed while the game is ${state.phase}`);
  }
}

function requireQuestionIndex(state: GameState): number {
  if (state.questionIndex === null) {
    throw new Error("The game has no active question");
  }

  return state.questionIndex;
}
