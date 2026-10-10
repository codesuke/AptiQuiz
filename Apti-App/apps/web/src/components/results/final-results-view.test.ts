import { describe, expect, it } from "vitest";
import {
  accuracyLabel,
  averageTimeLabel,
  isOwnResult,
  percent,
  topicLabel,
} from "./final-results-view";

describe("accuracyLabel", () => {
  it("shows the count and a rounded percentage", () => {
    expect(accuracyLabel(3, 5)).toBe("3/5 (60%)");
    expect(accuracyLabel(1, 3)).toBe("1/3 (33%)");
    expect(accuracyLabel(0, 4)).toBe("0/4 (0%)");
  });

  it("does not divide by zero", () => {
    expect(percent(0, 0)).toBe(0);
  });
});

describe("averageTimeLabel", () => {
  it("uses milliseconds below one second and seconds above", () => {
    expect(averageTimeLabel(420)).toBe("420 ms");
    expect(averageTimeLabel(1200)).toBe("1.2 s");
    expect(averageTimeLabel(1000)).toBe("1.0 s");
  });

  it("shows a dash rather than zero when there were no accepted Answers", () => {
    expect(averageTimeLabel(null)).toBe("—");
  });
});

describe("topicLabel", () => {
  it("includes topics with no correct Answer", () => {
    expect(topicLabel({ topic: "Logic", correct: 0, total: 2 })).toBe("Logic: 0/2 (0%)");
  });
});

describe("isOwnResult", () => {
  it("matches only the viewer's Participant id", () => {
    expect(isOwnResult({ participantId: "p-1" }, "p-1")).toBe(true);
    expect(isOwnResult({ participantId: "p-1" }, "p-2")).toBe(false);
    expect(isOwnResult({ participantId: "p-1" }, null)).toBe(false);
  });
});
