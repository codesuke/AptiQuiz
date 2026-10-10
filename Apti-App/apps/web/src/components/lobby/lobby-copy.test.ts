import { describe, expect, it } from "vitest";
import { participantCountLabel, questionCountLabel, SCORING_RULE } from "./lobby-copy";

describe("Lobby copy", () => {
  it("states the agreed scoring rule", () => {
    expect(SCORING_RULE).toBe(
      "Correct answers earn 500–1000 points — faster answers earn more. Wrong or unanswered Questions earn 0.",
    );
  });

  it("shows the roster count against the 50-player limit", () => {
    expect(participantCountLabel(0)).toBe("0 / 50");
    expect(participantCountLabel(50)).toBe("50 / 50");
  });

  it("pluralises the Question count", () => {
    expect(questionCountLabel(1)).toBe("1 Question");
    expect(questionCountLabel(10)).toBe("10 Questions");
  });
});
