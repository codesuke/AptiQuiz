import type { RoundView } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { clockOffsetMs, displaySeconds, receiveRound, remainingMs } from "./server-clock";

const round: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 0,
  questionCount: 10,
  startsAt: 100_000,
  endsAt: 130_000,
  serverTime: 100_500,
  question: {
    text: "What is 2 + 2?",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
    ],
    topic: "Arithmetic",
    difficulty: "EASY",
  },
};

describe("clockOffsetMs", () => {
  it("is positive when the server clock is ahead of the browser", () => {
    expect(clockOffsetMs(10_000, 7_000)).toBe(3_000);
  });

  it("is negative when the browser clock is ahead of the server", () => {
    expect(clockOffsetMs(10_000, 12_500)).toBe(-2_500);
  });
});

describe("receiveRound", () => {
  it("keeps the view and the offset measured at receipt", () => {
    expect(receiveRound(round, 90_500)).toEqual({ view: round, clockOffsetMs: 10_000 });
  });
});

describe("remainingMs", () => {
  it("counts down on server time even when the browser clock is wrong", () => {
    const { clockOffsetMs: offset } = receiveRound(round, 40_500);

    expect(remainingMs(round.endsAt, offset, 40_500)).toBe(29_500);
    expect(remainingMs(round.endsAt, offset, 50_500)).toBe(19_500);
  });

  it("gives two browsers with different clocks the same remaining time", () => {
    const early = receiveRound(round, 0);
    const late = receiveRound(round, 999_999);

    expect(remainingMs(round.endsAt, early.clockOffsetMs, 1_000)).toBe(
      remainingMs(round.endsAt, late.clockOffsetMs, 1_000_999),
    );
  });

  it("stops at zero after the deadline", () => {
    expect(remainingMs(round.endsAt, 0, 200_000)).toBe(0);
  });
});

describe("displaySeconds", () => {
  it("rounds a partial second up", () => {
    expect(displaySeconds(29_001)).toBe(30);
    expect(displaySeconds(1)).toBe(1);
    expect(displaySeconds(0)).toBe(0);
  });
});
