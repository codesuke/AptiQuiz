import { describe, expect, it } from "vitest";
import { InvariantFailure, Invariants } from "./invariants.js";
import { checkFinalResults, checkLeaderboard } from "./standings.js";

const board = [
  { participantId: "a", displayName: "Ann", rank: 1, totalScore: 900, movement: null },
  { participantId: "b", displayName: "Bob", rank: 2, totalScore: 0, movement: null },
];
const totals = new Map([
  ["a", 900],
  ["b", 0],
]);

function outcome(run: (invariants: Invariants) => void): string[] {
  const invariants = new Invariants();
  run(invariants);
  try {
    invariants.throwIfBroken();
    return [];
  } catch (error) {
    return error instanceof InvariantFailure ? [...error.details] : ["other"];
  }
}

describe("checkLeaderboard", () => {
  it("accepts ordered standings that match the revealed totals", () => {
    expect(outcome((i) => checkLeaderboard(i, "R0", board, totals, null))).toEqual([]);
  });

  it("flags a total that differs from the Round points", () => {
    const wrong = new Map([...totals, ["a", 800]]);
    expect(outcome((i) => checkLeaderboard(i, "R0", board, wrong, null))).toHaveLength(1);
  });

  it("flags unordered standings and wrong movement", () => {
    const swapped = [
      { ...board[1], rank: 1, totalScore: 0 },
      { ...board[0], rank: 2, totalScore: 900 },
    ] as typeof board;
    expect(outcome((i) => checkLeaderboard(i, "R1", swapped, totals, null)).length).toBeGreaterThan(
      0,
    );
    const previous = new Map([
      ["a", 2],
      ["b", 1],
    ]);
    expect(outcome((i) => checkLeaderboard(i, "R1", board, totals, previous)).length).toBe(2);
  });

  it("returns the ranks for the next Round", () => {
    const ranks = checkLeaderboard(new Invariants(), "R0", board, totals, null);
    expect([...ranks]).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

describe("checkFinalResults", () => {
  const result = (id: string, name: string, rank: number, totalScore: number, correct: number) => ({
    participantId: id,
    displayName: name,
    rank,
    totalScore,
    correctAnswers: correct,
    totalQuestions: 3,
    averageResponseMs: null,
    topics: [],
  });
  const ranks = new Map([
    ["a", 1],
    ["b", 2],
  ]);
  const expected = new Map([
    ["a", { displayName: "Ann", correctAnswers: 1 }],
    ["b", { displayName: "Bob", correctAnswers: 0 }],
  ]);

  it("accepts one matching result per Participant", () => {
    const results = [result("a", "Ann", 1, 900, 1), result("b", "Bob", 2, 0, 0)];
    expect(outcome((i) => checkFinalResults(i, results, totals, ranks, expected, 3))).toEqual([]);
  });

  it("flags a missing result and a wrong total", () => {
    const results = [result("a", "Ann", 1, 950, 1)];
    expect(outcome((i) => checkFinalResults(i, results, totals, ranks, expected, 3)).length).toBe(
      2,
    );
  });
});
