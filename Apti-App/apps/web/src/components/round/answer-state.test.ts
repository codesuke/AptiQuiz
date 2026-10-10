import type { LockedAnswer, RoundView } from "@aptiquiz/contracts";
import { describe, expect, it, vi } from "vitest";
import { answerKeyFor, canSubmitAnswer, lockedAnswerFor, lockedAnswerLabel } from "./answer-state";

const view: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 2,
  questionCount: 10,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_200,
  question: {
    text: "What is 2 + 2?",
    options: [
      { id: "opt-b", text: "4" },
      { id: "opt-a", text: "3" },
    ],
    topic: "Arithmetic",
    difficulty: "EASY",
  },
  answer: null,
};

const accepted: LockedAnswer = { questionIndex: 2, optionId: "opt-a", receivedAt: 5_000 };

describe("answerKeyFor", () => {
  it("reuses one key per Room and Question so a retry cannot add a second Answer", () => {
    const keys = new Map<string, string>();
    const createKey = vi.fn().mockReturnValueOnce("key-1").mockReturnValueOnce("key-2");

    expect(answerKeyFor(keys, view, createKey)).toBe("key-1");
    expect(answerKeyFor(keys, view, createKey)).toBe("key-1");
    expect(answerKeyFor(keys, { ...view, questionIndex: 3 }, createKey)).toBe("key-2");
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it("keeps Rooms apart", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const createKey = () => `key-${++next}`;

    expect(answerKeyFor(keys, view, createKey)).not.toBe(
      answerKeyFor(keys, { ...view, roomId: "room-2" }, createKey),
    );
  });
});

describe("lockedAnswerFor", () => {
  it("restores the server's record after a rejoin", () => {
    expect(lockedAnswerFor({ ...view, answer: accepted }, null)).toEqual(accepted);
  });

  it("uses this tab's accepted Answer only for the same Question", () => {
    expect(lockedAnswerFor(view, accepted)).toEqual(accepted);
    expect(lockedAnswerFor({ ...view, questionIndex: 3 }, accepted)).toBeNull();
    expect(lockedAnswerFor(view, null)).toBeNull();
  });
});

describe("lockedAnswerLabel", () => {
  it("names the chosen option and nothing about correctness", () => {
    expect(lockedAnswerLabel(view.question, accepted)).toBe("Answer locked: 3");
  });

  it("falls back when the option is unknown", () => {
    expect(lockedAnswerLabel(view.question, { ...accepted, optionId: "gone" })).toBe(
      "Answer locked.",
    );
  });
});

describe("canSubmitAnswer", () => {
  const open = { locked: false, pending: false, refused: false, timeUp: false, online: true };

  it("allows an Answer only while the Question is open and nothing is in flight", () => {
    expect(canSubmitAnswer(open)).toBe(true);
    expect(canSubmitAnswer({ ...open, locked: true })).toBe(false);
    expect(canSubmitAnswer({ ...open, pending: true })).toBe(false);
    expect(canSubmitAnswer({ ...open, refused: true })).toBe(false);
    expect(canSubmitAnswer({ ...open, timeUp: true })).toBe(false);
    expect(canSubmitAnswer({ ...open, online: false })).toBe(false);
  });
});
