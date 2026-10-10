import type { RevealedRound } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { personalResult } from "./personal-result";

const revealed: RevealedRound = {
  phase: "QUESTION_REVEAL",
  roomId: "room-1",
  questionIndex: 2,
  questionCount: 10,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 31_000,
  closedAt: 31_000,
  revealEndsAt: 37_000,
  question: {
    text: "What is 2 + 2?",
    options: [
      { id: "opt-b", text: "4" },
      { id: "opt-a", text: "3" },
    ],
    topic: "Arithmetic",
    difficulty: "EASY",
  },
  correctOptionId: "opt-b",
  answer: { questionIndex: 2, optionId: "opt-b", receivedAt: 5_000 },
  result: { correct: true, points: 870 },
  scores: [],
  leaderboard: [
    { participantId: "p-2", displayName: "Ravi", rank: 1, totalScore: 1_900, movement: 0 },
    { participantId: "p-1", displayName: "Asha", rank: 2, totalScore: 1_870, movement: 2 },
    { participantId: "p-3", displayName: "Meera", rank: 3, totalScore: 400, movement: -1 },
  ],
};

describe("personalResult", () => {
  it("takes the points from the server result and the rank from the server Leaderboard", () => {
    expect(personalResult(revealed, "p-1")).toEqual({
      outcome: "correct",
      headline: "Correct",
      points: 870,
      standing: { rank: 2, participantCount: 3, movement: 2 },
    });
  });

  it("separates a wrong Answer from no Answer", () => {
    const wrong = {
      ...revealed,
      answer: { questionIndex: 2, optionId: "opt-a", receivedAt: 5_000 },
      result: { correct: false, points: 0 },
    };
    expect(personalResult(wrong, "p-1")).toMatchObject({ outcome: "wrong", points: 0 });
    expect(personalResult({ ...wrong, answer: null }, "p-1")).toMatchObject({
      outcome: "no_answer",
      headline: "No answer",
      points: 0,
    });
  });

  it("has no standing when the server Leaderboard has no row for the viewer", () => {
    expect(personalResult(revealed, "p-9")?.standing).toBeNull();
  });

  it("has no result for the Host", () => {
    expect(personalResult({ ...revealed, answer: null, result: null }, "p-1")).toBeNull();
  });
});
