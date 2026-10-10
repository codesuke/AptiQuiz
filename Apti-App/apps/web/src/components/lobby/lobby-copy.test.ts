import { describe, expect, it } from "vitest";
import {
  joinedRoomHeading,
  participantCountLabel,
  participantsLabel,
  questionCountLabel,
  scoringRuleText,
  scoringSummaryText,
} from "./lobby-copy";

describe("Lobby copy", () => {
  it("names the joined state accurately and summarizes scoring", () => {
    expect(joinedRoomHeading(false)).toBe("Join the Lobby");
    expect(joinedRoomHeading(true)).toBe("You’re in the Room");
    expect(scoringSummaryText()).toContain("500–1000 points");
    expect(scoringSummaryText()).toContain("Faster");
  });
  it("states the scoring and timing rules from the Game Server's values", () => {
    expect(
      scoringRuleText({ roundDurationMs: 30_000, maxDelayCompensationMs: 100, scoreBucketMs: 100 }),
    ).toBe(
      "Each Question lasts 30 s. A correct Answer earns 500–1000 points: faster earns more. A wrong or missing Answer earns 0. The Game Server times every Answer; it subtracts up to 100 ms of measured network delay and rounds response time down to 100 ms steps. An Answer that arrives after the deadline does not count.",
    );
  });

  it("follows changed rule values", () => {
    const text = scoringRuleText({
      roundDurationMs: 12_500,
      maxDelayCompensationMs: 0,
      scoreBucketMs: 250,
    });
    expect(text).toContain("Each Question lasts 12.5 s.");
    expect(text).toContain("it does not adjust for network delay");
    expect(text).toContain("250 ms steps");
  });

  it("shows the roster count against the 50-player limit", () => {
    expect(participantCountLabel(0)).toBe("0 / 50");
    expect(participantCountLabel(50)).toBe("50 / 50");
  });

  it("pluralises the player count", () => {
    expect(participantsLabel(1)).toBe("1 player");
    expect(participantsLabel(3)).toBe("3 players");
  });

  it("pluralises the Question count", () => {
    expect(questionCountLabel(1)).toBe("1 Question");
    expect(questionCountLabel(10)).toBe("10 Questions");
  });
});
