import { describe, expect, it } from "vitest";
import { calculateScore, createGameState, transitionGame } from "./index.js";

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
