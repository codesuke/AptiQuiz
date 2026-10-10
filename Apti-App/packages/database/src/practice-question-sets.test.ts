import { describe, expect, it } from "vitest";
import { PRACTICE_QUESTION_SETS } from "./practice-question-sets.js";
import { questionInputSchema } from "./question-sets.js";

describe("practice Question Sets", () => {
  for (const set of PRACTICE_QUESTION_SETS) {
    describe(set.title, () => {
      it("holds 12 valid Questions with unique text", () => {
        expect(set.questions).toHaveLength(12);
        for (const item of set.questions)
          expect(() => questionInputSchema.parse(item)).not.toThrow();
        expect(new Set(set.questions.map((item) => item.text)).size).toBe(12);
      });

      it("orders Questions from easier to harder", () => {
        const rank = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
        const ranks = set.questions.map((item) => rank[item.difficulty]);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      });
    });
  }

  it("uses unique set ids", () => {
    expect(new Set(PRACTICE_QUESTION_SETS.map((set) => set.id)).size).toBe(
      PRACTICE_QUESTION_SETS.length,
    );
  });
});
