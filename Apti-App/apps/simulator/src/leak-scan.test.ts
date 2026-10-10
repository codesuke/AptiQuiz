import { describe, expect, it } from "vitest";
import { findPreRevealLeaks } from "./leak-scan.js";

const open = {
  phase: "QUESTION_OPEN",
  question: { text: "q", options: [{ id: "x", text: "20" }] },
  answer: { questionIndex: 0, optionId: "x", receivedAt: 1 },
};

describe("findPreRevealLeaks", () => {
  it("accepts an open Round and a Lobby with rules", () => {
    expect(findPreRevealLeaks(open)).toEqual([]);
    expect(findPreRevealLeaks({ phase: "LOBBY", rules: { scoreBucketMs: 100 } })).toEqual([]);
  });

  it.each([
    ["correctOptionId", { ...open, correctOptionId: "x" }],
    ["isCorrect", { ok: true, answer: { isCorrect: true } }],
    ["explanation", { ...open, question: { ...open.question, explanation: "because" } }],
    ["points", { ok: true, points: 800 }],
  ])("flags %s", (_name, payload) => {
    expect(findPreRevealLeaks(payload)).not.toEqual([]);
  });

  it("does not scan a revealed Round or a finished Lobby", () => {
    expect(findPreRevealLeaks({ phase: "QUESTION_REVEAL", correctOptionId: "x" })).toEqual([]);
    expect(findPreRevealLeaks({ phase: "FINISHED", results: [{ correctAnswers: 2 }] })).toEqual([]);
  });

  it("reports the path of a nested disclosure", () => {
    expect(findPreRevealLeaks({ lobby: { rounds: [{ result: {} }] } })).toEqual([
      "$.lobby.rounds[0].result",
    ]);
  });
});
