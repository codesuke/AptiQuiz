import { describe, expect, it } from "vitest";
import { cohortOf, expectedCounts, planFor } from "./cohorts.js";

describe("cohorts", () => {
  it("assigns every case within five Participants", () => {
    expect([1, 2, 3, 4, 5].map(cohortOf)).toEqual([
      "late",
      "correct",
      "wrong",
      "duplicate",
      "replay",
    ]);
  });

  it("keeps the late cohort unanswered only in the first Round", () => {
    expect(planFor("late", 0)).toEqual({ kind: "wait-for-deadline" });
    expect(planFor("late", 1)).toMatchObject({ kind: "answer", choice: "correct" });
  });

  it("counts planned outcomes for 50 Participants and 3 Questions", () => {
    expect(expectedCounts(50, 3)).toEqual({
      accepted: 50 * 3 - 10,
      duplicateRejections: 30,
      lateRejections: 10,
      exactKeyReplays: 30,
      unanswered: 10,
    });
  });
});
