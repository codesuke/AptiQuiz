export const gamePhases = [
  "LOBBY",
  "QUESTION_OPEN",
  "QUESTION_REVEAL",
  "LEADERBOARD",
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
}

export type GameCommand =
  | { readonly type: "START"; readonly durationMs: number }
  | { readonly type: "CLOSE_QUESTION" }
  | { readonly type: "SHOW_LEADERBOARD" }
  | { readonly type: "ADVANCE"; readonly durationMs: number };

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
  };
}

export function transitionGame(
  state: GameState,
  command: GameCommand,
  serverTime: number,
): TransitionResult {
  assertTimestamp(serverTime);

  switch (command.type) {
    case "START":
      assertPhase(state, "LOBBY", command.type);
      return openQuestion(state, 0, command.durationMs, serverTime);
    case "CLOSE_QUESTION":
      assertPhase(state, "QUESTION_OPEN", command.type);
      return {
        state: { ...state, phase: "QUESTION_REVEAL" },
        events: [{ type: "QUESTION_CLOSED", questionIndex: requireQuestionIndex(state) }],
      };
    case "SHOW_LEADERBOARD":
      assertPhase(state, "QUESTION_REVEAL", command.type);
      return {
        state: { ...state, phase: "LEADERBOARD" },
        events: [{ type: "LEADERBOARD_SHOWN" }],
      };
    case "ADVANCE": {
      assertPhase(state, "LEADERBOARD", command.type);
      const nextQuestionIndex = requireQuestionIndex(state) + 1;

      if (nextQuestionIndex >= state.questionCount) {
        return {
          state: {
            ...state,
            phase: "FINISHED",
            roundStartsAt: null,
            roundEndsAt: null,
          },
          events: [{ type: "GAME_FINISHED" }],
        };
      }

      return openQuestion(state, nextQuestionIndex, command.durationMs, serverTime);
    }
  }
}

export function calculateScore(effectiveElapsedMs: number, durationMs: number): number {
  assertDuration(durationMs);
  const elapsedRatio = clamp(effectiveElapsedMs / durationMs, 0, 1);
  return 500 + Math.floor(500 * (1 - elapsedRatio));
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

function assertPhase(state: GameState, expected: GamePhase, command: GameCommand["type"]): void {
  if (state.phase !== expected) {
    throw new Error(`${command} is not allowed while the game is ${state.phase}`);
  }
}

function requireQuestionIndex(state: GameState): number {
  if (state.questionIndex === null) {
    throw new Error("The game has no active question");
  }

  return state.questionIndex;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
