import type { RoundScore } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { formatResponseTime, revealOutcome, roundPointsLabel } from "./reveal-outcome";

function score(overrides: Partial<RoundScore> & Pick<RoundScore, "participantId">): RoundScore {
  return {
    displayName: `Name ${overrides.participantId}`,
    answered: true,
    correct: false,
    points: 0,
    effectiveResponseMs: null,
    ...overrides,
  };
}

describe("revealOutcome", () => {
  it("selects the correct Participant with the lowest server Effective Response Time", () => {
    const outcome = revealOutcome([
      score({ participantId: "p-1", correct: true, points: 820, effectiveResponseMs: 5_400 }),
      score({ participantId: "p-2", correct: false, points: 0, effectiveResponseMs: 300 }),
      score({ participantId: "p-3", correct: true, points: 960, effectiveResponseMs: 1_200 }),
      score({ participantId: "p-4", answered: false }),
    ]);

    expect(outcome.fastestCorrect).toEqual({
      participantId: "p-3",
      displayName: "Name p-3",
      effectiveResponseMs: 1_200,
    });
    expect(outcome.correctCount).toBe(2);
    expect(outcome.participantCount).toBe(4);
  });

  it("keeps the earlier Participant in join order when two correct times tie", () => {
    const outcome = revealOutcome([
      score({ participantId: "p-1", correct: true, effectiveResponseMs: 900 }),
      score({ participantId: "p-2", correct: true, effectiveResponseMs: 900 }),
    ]);

    expect(outcome.fastestCorrect?.participantId).toBe("p-1");
  });

  it("has no fastest winner when no Participant is correct", () => {
    const outcome = revealOutcome([
      score({ participantId: "p-1", effectiveResponseMs: 400 }),
      score({ participantId: "p-2", answered: false }),
    ]);

    expect(outcome.correctCount).toBe(0);
    expect(outcome.fastestCorrect).toBeNull();
  });

  it("ignores a correct score without a server time rather than inventing one", () => {
    const outcome = revealOutcome([score({ participantId: "p-1", correct: true, points: 700 })]);

    expect(outcome.correctCount).toBe(1);
    expect(outcome.fastestCorrect).toBeNull();
  });

  it("maps each Participant to the Round points the server revealed", () => {
    const outcome = revealOutcome([
      score({ participantId: "p-1", correct: true, points: 870, effectiveResponseMs: 1_000 }),
      score({ participantId: "p-2", answered: false }),
    ]);

    expect(outcome.pointsByParticipant.get("p-1")).toBe(870);
    expect(outcome.pointsByParticipant.get("p-2")).toBe(0);
    expect(outcome.pointsByParticipant.has("p-3")).toBe(false);
  });
});

describe("formatResponseTime", () => {
  it("shows seconds with one decimal place", () => {
    expect(formatResponseTime(1_200)).toBe("1.2 s");
    expect(formatResponseTime(0)).toBe("0.0 s");
    expect(formatResponseTime(29_900)).toBe("29.9 s");
  });
});

describe("roundPointsLabel", () => {
  it("signs the Round points", () => {
    expect(roundPointsLabel(870)).toBe("+870");
    expect(roundPointsLabel(0)).toBe("+0");
  });
});
