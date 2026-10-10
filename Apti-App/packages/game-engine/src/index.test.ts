import { describe, expect, it } from "vitest";
import { calculateScore, createGameState, orderOptions, transitionGame } from "./index.js";

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
    expect(finished.state.phase).toBe("FINISHED");
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
