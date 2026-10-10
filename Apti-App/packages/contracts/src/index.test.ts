import { describe, expect, it } from "vitest";
import { openRoundSchema, roomCodeSchema, roundScoreSchema } from "./index.js";

describe("roomCodeSchema", () => {
  it("normalizes a valid room code", () => {
    expect(roomCodeSchema.parse(" ab2cd3 ")).toBe("AB2CD3");
  });

  it("rejects ambiguous characters", () => {
    expect(roomCodeSchema.safeParse("ABI0O1").success).toBe(false);
  });
});

describe("roundScoreSchema", () => {
  const base = {
    participantId: "participant-1",
    displayName: "Asha",
    answered: true,
    correct: true,
    points: 880,
  };

  it("carries the Effective Response Time of an accepted Answer", () => {
    expect(roundScoreSchema.parse({ ...base, effectiveResponseMs: 1_200 })).toMatchObject({
      effectiveResponseMs: 1_200,
    });
  });

  it("accepts null or no Effective Response Time without an accepted Answer", () => {
    const unanswered = { ...base, answered: false, correct: false, points: 0 };

    expect(roundScoreSchema.parse({ ...unanswered, effectiveResponseMs: null })).toMatchObject({
      effectiveResponseMs: null,
    });
    expect(roundScoreSchema.safeParse(unanswered).success).toBe(true);
  });

  it("rejects a negative or fractional Effective Response Time", () => {
    expect(roundScoreSchema.safeParse({ ...base, effectiveResponseMs: -1 }).success).toBe(false);
    expect(roundScoreSchema.safeParse({ ...base, effectiveResponseMs: 1.5 }).success).toBe(false);
  });
});

describe("openRoundSchema", () => {
  it("drops correctness, points, and response time from an open Round", () => {
    const open = openRoundSchema.parse({
      roomId: "room-1",
      questionIndex: 0,
      questionCount: 3,
      startsAt: 1_000,
      endsAt: 31_000,
      serverTime: 2_000,
      question: {
        text: "2 + 2?",
        options: [
          { id: "a", text: "4" },
          { id: "b", text: "5" },
        ],
        topic: "Arithmetic",
        difficulty: "EASY",
      },
      phase: "QUESTION_OPEN",
      answer: { questionIndex: 0, optionId: "a", receivedAt: 2_200 },
      correct: true,
      points: 880,
      effectiveResponseMs: 1_200,
      scores: [],
    });

    for (const field of ["correct", "points", "effectiveResponseMs", "scores"]) {
      expect(open).not.toHaveProperty(field);
    }
    expect(open.answer).not.toHaveProperty("effectiveResponseMs");
  });
});
