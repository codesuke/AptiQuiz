import { describe, expect, it } from "vitest";
import {
  calculateScore,
  createGameState,
  type GameState,
  orderOptions,
  transitionGame,
} from "./index.js";

describe("game engine", () => {
  it("moves a room through one complete question", () => {
    const lobby = createGameState("room-1", 1);
    const opened = transitionGame(lobby, { type: "START", durationMs: 10_000 }, 1_000);
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 5_000);
    const leaderboard = transitionGame(revealed.state, { type: "SHOW_LEADERBOARD" }, 5_100);
    const finished = transitionGame(
      leaderboard.state,
      { type: "ADVANCE", durationMs: 10_000 },
      6_000,
    );

    expect(opened.state.roundEndsAt).toBe(11_000);
    expect(finished.state.phase).toBe("FINALIZING_RESULTS");
  });

  it("records when a Question closes and keeps its deadline", () => {
    const opened = transitionGame(
      createGameState("room-1", 2),
      { type: "START", durationMs: 10_000 },
      1_000,
    );
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 4_000);
    const leaderboard = transitionGame(revealed.state, { type: "SHOW_LEADERBOARD" }, 4_100);
    const next = transitionGame(leaderboard.state, { type: "ADVANCE", durationMs: 10_000 }, 5_000);

    expect(opened.state.roundClosedAt).toBeNull();
    expect(revealed.state).toMatchObject({
      phase: "QUESTION_REVEAL",
      roundStartsAt: 1_000,
      roundEndsAt: 11_000,
      roundClosedAt: 4_000,
    });
    expect(revealed.events).toEqual([{ type: "QUESTION_CLOSED", questionIndex: 0 }]);
    expect(next.state).toMatchObject({ questionIndex: 1, roundClosedAt: null });
  });

  it("closes a Question only once", () => {
    const opened = transitionGame(
      createGameState("room-1", 1),
      { type: "START", durationMs: 10_000 },
      1_000,
    );
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 4_000);

    expect(() => transitionGame(revealed.state, { type: "CLOSE_QUESTION" }, 5_000)).toThrow(
      "CLOSE_QUESTION is not allowed while the game is QUESTION_REVEAL",
    );
  });

  it("advances from a reveal to the next Question with a fresh deadline", () => {
    const opened = transitionGame(
      createGameState("room-1", 3),
      { type: "START", durationMs: 10_000 },
      1_000,
    );
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 4_000);
    const next = transitionGame(revealed.state, { type: "ADVANCE", durationMs: 10_000 }, 6_000);

    expect(next.state).toMatchObject({
      phase: "QUESTION_OPEN",
      questionIndex: 1,
      roundStartsAt: 6_000,
      roundEndsAt: 16_000,
      roundClosedAt: null,
    });
    expect(next.events).toEqual([{ type: "QUESTION_OPENED", questionIndex: 1 }]);
  });

  it("finalizes after the last reveal and completes only after saving", () => {
    const opened = transitionGame(
      createGameState("room-1", 1),
      { type: "START", durationMs: 10_000 },
      1_000,
    );
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 4_000);
    const finalizing = transitionGame(
      revealed.state,
      { type: "ADVANCE", durationMs: 10_000 },
      6_000,
    );
    const finished = transitionGame(finalizing.state, { type: "COMPLETE" }, 7_000);

    expect(finalizing.state).toMatchObject({
      phase: "FINALIZING_RESULTS",
      roundStartsAt: null,
      roundEndsAt: null,
      roundClosedAt: null,
    });
    expect(finalizing.events).toEqual([]);
    expect(finished.state.phase).toBe("FINISHED");
    expect(finished.events).toEqual([{ type: "GAME_FINISHED" }]);
  });

  it.each([
    ["LOBBY", (state: GameState) => state],
    [
      "QUESTION_OPEN",
      (state: GameState) =>
        transitionGame(state, { type: "START", durationMs: 10_000 }, 1_000).state,
    ],
  ])("refuses to advance while the game is %s", (phase, reach) => {
    const state = reach(createGameState("room-1", 2));

    expect(() => transitionGame(state, { type: "ADVANCE", durationMs: 10_000 }, 2_000)).toThrow(
      `ADVANCE is not allowed while the game is ${phase}`,
    );
  });

  it("refuses to advance a finished game", () => {
    const opened = transitionGame(
      createGameState("room-1", 1),
      { type: "START", durationMs: 10_000 },
      1_000,
    );
    const revealed = transitionGame(opened.state, { type: "CLOSE_QUESTION" }, 4_000);
    const finalizing = transitionGame(
      revealed.state,
      { type: "ADVANCE", durationMs: 10_000 },
      6_000,
    );
    const finished = transitionGame(finalizing.state, { type: "COMPLETE" }, 7_000);

    expect(() =>
      transitionGame(finished.state, { type: "ADVANCE", durationMs: 10_000 }, 7_000),
    ).toThrow("ADVANCE is not allowed while the game is FINISHED");
  });

  it("rejects commands that violate the state machine", () => {
    const lobby = createGameState("room-1", 1);

    expect(() => transitionGame(lobby, { type: "CLOSE_QUESTION" }, 1_000)).toThrow(
      "CLOSE_QUESTION is not allowed while the game is LOBBY",
    );
  });
});

describe("calculateScore", () => {
  it("rewards faster correct answers without dropping below the base score", () => {
    expect(calculateScore(0, 10_000)).toBe(1_000);
    expect(calculateScore(5_000, 10_000)).toBe(750);
    expect(calculateScore(20_000, 10_000)).toBe(500);
  });
});

describe("orderOptions", () => {
  const options = ["a", "b", "c", "d", "e", "f"] as const;

  it("returns a permutation of the options without changing the input", () => {
    const input = [...options];
    const ordered = orderOptions(input, "room-salt:0:participant-1");

    expect(input).toEqual(options);
    expect([...ordered].sort()).toEqual([...options]);
  });

  it("gives the same order for the same seed", () => {
    expect(orderOptions(options, "seed-1")).toEqual(orderOptions(options, "seed-1"));
  });

  it("varies the order across seeds", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, index) => orderOptions(options, `seed-${index}`).join("")),
    );

    expect(orders.size).toBeGreaterThan(1);
  });

  it("keeps empty and single-option lists as they are", () => {
    expect(orderOptions([], "seed")).toEqual([]);
    expect(orderOptions(["only"], "seed")).toEqual(["only"]);
  });
});
