import { describe, expect, it } from "vitest";
import { DEADLINE_SAFETY_MS, planBotRound } from "./bot-plan.js";

const base = {
  botNumber: 3,
  questionIndex: 1,
  optionCount: 4,
  remainingMs: 30_000,
  maxAnswerDelayMs: 8_000,
  skipPercent: 0,
};

describe("planBotRound", () => {
  it("is reproducible", () => {
    expect(planBotRound(base)).toEqual(planBotRound(base));
  });

  it("answers inside the option range and the delay ceiling", () => {
    for (let bot = 1; bot <= 200; bot += 1) {
      const plan = planBotRound({ ...base, botNumber: bot });
      expect(plan.kind).toBe("answer");
      if (plan.kind === "answer") {
        expect(plan.optionIndex).toBeGreaterThanOrEqual(0);
        expect(plan.optionIndex).toBeLessThan(4);
        expect(plan.delayMs).toBeLessThanOrEqual(8_000);
      }
    }
  });

  it("stays clear of a near deadline", () => {
    for (let bot = 1; bot <= 100; bot += 1) {
      const plan = planBotRound({ ...base, botNumber: bot, remainingMs: 2_000 });
      if (plan.kind === "answer")
        expect(plan.delayMs).toBeLessThanOrEqual(2_000 - DEADLINE_SAFETY_MS);
    }
  });

  it("skips everything at 100 percent and nothing at 0", () => {
    expect(planBotRound({ ...base, skipPercent: 100 })).toEqual({ kind: "skip" });
    expect(planBotRound(base).kind).toBe("answer");
  });
});
