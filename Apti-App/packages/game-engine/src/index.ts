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
