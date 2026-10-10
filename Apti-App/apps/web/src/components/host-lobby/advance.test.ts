import type { LobbySnapshot, RoundView } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import {
  advanceKeyFor,
  advanceLabel,
  advancePendingLabel,
  canAdvance,
  currentAdvance,
  NO_ADVANCE,
} from "./advance";

const question = {
  text: "What is 2 + 2?",
  options: [
    { id: "opt-a", text: "3" },
    { id: "opt-b", text: "4" },
  ],
  topic: "Arithmetic",
  difficulty: "EASY" as const,
};

const open: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 0,
  questionCount: 3,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_000,
  question,
  answer: null,
};

const revealed: RoundView = {
  ...open,
  phase: "QUESTION_REVEAL",
  serverTime: 31_000,
  closedAt: 31_000,
  correctOptionId: "opt-b",
  result: null,
  scores: [],
  leaderboard: [],
};

const lobby = (phase: LobbySnapshot["phase"]): LobbySnapshot => ({
  roomId: "room-1",
  joinCode: "ABC234",
  phase,
  college: { id: "college-1", name: "Test College" },
  questionSetTitle: "Starter",
  questionCount: 3,
  participants: [],
  rules: { roundDurationMs: 30_000, maxDelayCompensationMs: 250, scoreBucketMs: 100 },
});

describe("advanceLabel", () => {
  it("offers the next Question until the last one, then finishing the match", () => {
    expect(advanceLabel({ questionIndex: 0, questionCount: 3 })).toBe("Next question");
    expect(advanceLabel({ questionIndex: 1, questionCount: 3 })).toBe("Next question");
    expect(advanceLabel({ questionIndex: 2, questionCount: 3 })).toBe("Finish match");
    expect(advanceLabel({ questionIndex: 0, questionCount: 1 })).toBe("Finish match");
  });

  it("describes the pending step the same way", () => {
    expect(advancePendingLabel({ questionIndex: 0, questionCount: 3 })).toBe("Opening…");
    expect(advancePendingLabel({ questionIndex: 2, questionCount: 3 })).toBe("Finishing…");
  });
});

describe("canAdvance", () => {
  it("allows advancing only from a revealed Round of an unfinished Room", () => {
    expect(canAdvance(lobby("QUESTION_REVEAL"), revealed)).toBe(true);
    expect(canAdvance(lobby("QUESTION_OPEN"), open)).toBe(false);
    expect(canAdvance(lobby("FINISHED"), revealed)).toBe(false);
    expect(canAdvance(lobby("QUESTION_REVEAL"), null)).toBe(false);
  });
});

describe("advanceKeyFor", () => {
  it("reuses one key for retries from the same revealed Question", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const createKey = () => `key-${++next}`;

    const first = advanceKeyFor(keys, revealed, createKey);
    expect(advanceKeyFor(keys, revealed, createKey)).toBe(first);
    expect(advanceKeyFor(keys, { ...revealed, questionIndex: 1 }, createKey)).not.toBe(first);
    expect(advanceKeyFor(keys, { ...revealed, roomId: "room-2" }, createKey)).not.toBe(first);
  });
});

describe("currentAdvance", () => {
  it("keeps the pending or refused attempt for the shown Question", () => {
    const attempt = { questionIndex: 0, pending: false, error: "round_not_revealed" as const };
    expect(currentAdvance(attempt, revealed)).toBe(attempt);
  });

  it("drops an attempt from an earlier Question once the next one is shown", () => {
    const attempt = { questionIndex: 0, pending: false, error: "advance_failed" as const };
    expect(currentAdvance(attempt, { ...open, questionIndex: 1 })).toEqual(NO_ADVANCE);
    expect(currentAdvance(attempt, null)).toEqual(NO_ADVANCE);
    expect(currentAdvance(null, revealed)).toEqual(NO_ADVANCE);
  });
});
