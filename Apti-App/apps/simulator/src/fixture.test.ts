import { describe, expect, it } from "vitest";
import { correctOptionId, fixtureMismatch, wrongOptionId } from "./fixture.js";

const question = {
  text: "What is 25% of 80?",
  options: [
    { id: "o1", text: "40" },
    { id: "o2", text: "20" },
    { id: "o3", text: "25" },
  ],
  topic: "Percentages",
  difficulty: "EASY" as const,
};

describe("starter fixture", () => {
  it("matches shuffled options by text and finds the intended choices", () => {
    expect(fixtureMismatch(0, question)).toBeNull();
    expect(correctOptionId(0, question)).toBe("o2");
    expect(wrongOptionId(0, question)).toBe("o1");
  });

  it("names a text or option difference", () => {
    expect(fixtureMismatch(0, { ...question, text: "Other?" })).toMatch(/text differs/);
    expect(
      fixtureMismatch(0, {
        ...question,
        options: [...question.options.slice(0, 2), { id: "o3", text: "99" }],
      }),
    ).toMatch(/options differ/);
    expect(fixtureMismatch(7, question)).toMatch(/outside/);
  });
});
