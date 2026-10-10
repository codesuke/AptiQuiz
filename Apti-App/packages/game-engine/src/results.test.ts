import { describe, expect, it } from "vitest";
import { type ResultAnswer, summarizeMatch } from "./results.js";

const topics = ["Math", "Logic", "Math"];

function answer(
  overrides: Partial<ResultAnswer> & Pick<ResultAnswer, "participantId">,
): ResultAnswer {
  return { questionIndex: 0, correct: true, points: 800, effectiveResponseMs: 1_000, ...overrides };
}

describe("summarizeMatch", () => {
  it("counts unanswered Questions in accuracy and Topic totals", () => {
    const [only] = summarizeMatch({
      questionTopics: topics,
      participants: [{ participantId: "a", joinedAt: 1 }],
      answers: [answer({ participantId: "a" })],
    });

    expect(only).toMatchObject({ correctAnswers: 1, questionCount: 3, totalScore: 800 });
    expect(only?.topics).toEqual([
      { topic: "Math", correct: 1, total: 2 },
      { topic: "Logic", correct: 0, total: 1 },
    ]);
  });

  it("averages every accepted Answer, including incorrect ones, and rounds", () => {
    const [only] = summarizeMatch({
      questionTopics: topics,
      participants: [{ participantId: "a", joinedAt: 1 }],
      answers: [
        answer({ participantId: "a", effectiveResponseMs: 1_000 }),
        answer({
          participantId: "a",
          questionIndex: 1,
          correct: false,
          points: 0,
          effectiveResponseMs: 2_000,
        }),
        answer({ participantId: "a", questionIndex: 2, effectiveResponseMs: 2_000 }),
      ],
    });

    expect(only?.averageResponseMs).toBe(1_667);
  });

  it("reports an unavailable average without accepted Answers and ranks everyone", () => {
    const summaries = summarizeMatch({
      questionTopics: topics,
      participants: [
        { participantId: "silent", joinedAt: 1 },
        { participantId: "scorer", joinedAt: 2 },
      ],
      answers: [answer({ participantId: "scorer" })],
    });

    expect(summaries.map(({ participantId, rank }) => [participantId, rank])).toEqual([
      ["scorer", 1],
      ["silent", 2],
    ]);
    expect(summaries[1]).toMatchObject({ averageResponseMs: null, totalScore: 0 });
  });
});
