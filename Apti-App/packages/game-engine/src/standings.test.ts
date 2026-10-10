import { describe, expect, it } from "vitest";
import { rankStandings, type Standing } from "./standings.js";

function standing(participantId: string, overrides: Partial<Standing> = {}): Standing {
  return { participantId, joinedAt: 1, totalScore: 0, correctResponseMs: 0, ...overrides };
}

describe("rankStandings", () => {
  it("orders by total score, highest first, with ranks 1..n", () => {
    const ranked = rankStandings(
      [standing("a", { totalScore: 500 }), standing("b", { totalScore: 900 })],
      null,
    );

    expect(ranked.map(({ participantId, rank }) => [participantId, rank])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });

  it("breaks a score tie by lower total correct response time", () => {
    const ranked = rankStandings(
      [
        standing("slow", { totalScore: 900, correctResponseMs: 9_000 }),
        standing("fast", { totalScore: 900, correctResponseMs: 3_000 }),
      ],
      null,
    );

    expect(ranked.map(({ participantId }) => participantId)).toEqual(["fast", "slow"]);
  });

  it("then breaks the tie by earlier join time", () => {
    const ranked = rankStandings(
      [standing("late", { joinedAt: 20 }), standing("early", { joinedAt: 10 })],
      null,
    );

    expect(ranked.map(({ participantId }) => participantId)).toEqual(["early", "late"]);
  });

  it("finally breaks the tie by Participant ID, never sharing a rank", () => {
    const ranked = rankStandings([standing("b"), standing("a"), standing("c")], null);

    expect(ranked.map(({ participantId, rank }) => [participantId, rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("reports null movement without previous standings", () => {
    const [first] = rankStandings([standing("a")], null);

    expect(first?.movement).toBeNull();
  });

  it("reports movement as previous rank minus current rank", () => {
    const previous = [standing("a", { totalScore: 900 }), standing("b", { totalScore: 500 })];
    const current = [standing("a", { totalScore: 900 }), standing("b", { totalScore: 1_500 })];

    const ranked = rankStandings(current, previous);

    expect(ranked.map(({ participantId, movement }) => [participantId, movement])).toEqual([
      ["b", 1],
      ["a", -1],
    ]);
  });

  it("reports 0 for an unchanged rank and does not change the input", () => {
    const current = [standing("a", { totalScore: 5 }), standing("b")];
    const snapshot = current.map((entry) => ({ ...entry }));

    const ranked = rankStandings(current, current);

    expect(ranked.map(({ movement }) => movement)).toEqual([0, 0]);
    expect(current).toEqual(snapshot);
  });
});
