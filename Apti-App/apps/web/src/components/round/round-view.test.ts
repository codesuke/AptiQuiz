import type { RevealedRound, RoundView } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { countdownLabel, isMatchFinished, nextRound, revealedOptionLabels } from "./round-view";

const question = {
  text: "What is 2 + 2?",
  options: [
    { id: "opt-b", text: "4" },
    { id: "opt-a", text: "3" },
  ],
  topic: "Arithmetic",
  difficulty: "EASY" as const,
};

const open: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 2,
  questionCount: 10,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_200,
  question,
  answer: null,
};

const revealed: RevealedRound = {
  ...open,
  phase: "QUESTION_REVEAL",
  serverTime: 31_000,
  closedAt: 31_000,
  revealEndsAt: 37_000,
  correctOptionId: "opt-b",
  answer: { questionIndex: 2, optionId: "opt-a", receivedAt: 5_000 },
  result: { correct: false, points: 0 },
  scores: [
    { participantId: "p-1", displayName: "Asha", answered: true, correct: false, points: 0 },
  ],
  leaderboard: [
    { participantId: "p-1", displayName: "Asha", rank: 1, totalScore: 0, movement: null },
  ],
};

const received = (view: RoundView) => ({ view, clockOffsetMs: 0 });

describe("countdownLabel", () => {
  it("shows seconds left, then Time's up at the deadline", () => {
    expect(countdownLabel(12)).toBe("12s left");
    expect(countdownLabel(0)).toBe("Time's up");
  });
});

describe("revealedOptionLabels", () => {
  it("marks the correct option and the receiver's own pick separately", () => {
    expect(revealedOptionLabels(revealed, "opt-b")).toEqual(["Correct answer"]);
    expect(revealedOptionLabels(revealed, "opt-a")).toEqual(["Your answer"]);
  });

  it("marks one option twice when the pick was correct", () => {
    const right = {
      ...revealed,
      answer: { questionIndex: 2, optionId: "opt-b", receivedAt: 5_000 },
    };
    expect(revealedOptionLabels(right, "opt-b")).toEqual(["Correct answer", "Your answer"]);
    expect(revealedOptionLabels(right, "opt-a")).toEqual([]);
  });

  it("marks only the correct option for the Host, who has no Answer", () => {
    const host = { ...revealed, answer: null, result: null };
    expect(revealedOptionLabels(host, "opt-a")).toEqual([]);
    expect(revealedOptionLabels(host, "opt-b")).toEqual(["Correct answer"]);
  });
});

describe("nextRound", () => {
  it("takes the first view and any newer view", () => {
    expect(nextRound(null, received(open))).toEqual(received(open));
    expect(nextRound(received(open), received(revealed))).toEqual(received(revealed));
    const nextOpen = { ...open, questionIndex: 3 };
    expect(nextRound(received(revealed), received(nextOpen))).toEqual(received(nextOpen));
  });

  it("keeps a reveal when a late open view of the same Question arrives", () => {
    expect(nextRound(received(revealed), received(open))).toEqual(received(revealed));
  });

  it("keeps the current Question when a late view of an earlier Question arrives", () => {
    const nextOpen = { ...open, questionIndex: open.questionIndex + 1 };
    expect(nextRound(received(nextOpen), received(revealed))).toEqual(received(nextOpen));
  });
});

describe("isMatchFinished", () => {
  it("is true only once the Game Server finished the Room", () => {
    expect(isMatchFinished({ phase: "FINISHED" })).toBe(true);
    expect(isMatchFinished({ phase: "QUESTION_REVEAL" })).toBe(false);
    expect(isMatchFinished({ phase: "LOBBY" })).toBe(false);
    expect(isMatchFinished(null)).toBe(false);
  });
});
