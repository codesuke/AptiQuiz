import type { RoundView } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { scoreAfter } from "./participant-score";

const base = {
  roomId: "room-1",
  questionIndex: 0,
  questionCount: 3,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 2_000,
  question: {
    text: "2 + 2?",
    options: [
      { id: "x", text: "4" },
      { id: "y", text: "5" },
    ],
    topic: "Arithmetic",
    difficulty: "EASY" as const,
  },
};

const open: RoundView = { ...base, phase: "QUESTION_OPEN", answer: null };

const revealed: RoundView = {
  ...base,
  phase: "QUESTION_REVEAL",
  closedAt: 20_000,
  correctOptionId: "x",
  answer: null,
  result: { correct: true, points: 900 },
  scores: [],
  leaderboard: [
    { participantId: "p-1", displayName: "Asha", rank: 1, totalScore: 1_900, movement: null },
    { participantId: "p-2", displayName: "Ravi", rank: 2, totalScore: 600, movement: null },
  ],
};

describe("scoreAfter", () => {
  it("takes the Participant's Leaderboard total from a reveal", () => {
    expect(scoreAfter(1_000, revealed, "p-1")).toBe(1_900);
    expect(scoreAfter(0, revealed, "p-2")).toBe(600);
  });

  it("keeps the known total for an open Round", () => {
    expect(scoreAfter(1_000, open, "p-1")).toBe(1_000);
  });

  it("keeps the known total when the reveal does not list the Participant", () => {
    expect(scoreAfter(700, revealed, "p-9")).toBe(700);
  });
});
