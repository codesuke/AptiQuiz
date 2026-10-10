import type { FinalResult, LeaderboardEntry } from "@aptiquiz/contracts";
import type { Invariants } from "./invariants.js";

/**
 * Checks one Leaderboard against the totals of revealed Round points. Returns the ranks it saw,
 * which the next Round uses to check `movement`.
 */
export function checkLeaderboard(
  invariants: Invariants,
  who: string,
  leaderboard: readonly LeaderboardEntry[],
  totals: ReadonlyMap<string, number>,
  previousRanks: ReadonlyMap<string, number> | null,
): Map<string, number> {
  const ranks = new Map<string, number>();
  invariants.check(leaderboard.length === totals.size, `${who}: Leaderboard size differs`);
  let previousTotal = Number.POSITIVE_INFINITY;
  leaderboard.forEach((entry, position) => {
    invariants.check(
      entry.rank === position + 1,
      `${who}: rank ${entry.rank} at place ${position + 1}`,
    );
    invariants.check(
      entry.totalScore <= previousTotal,
      `${who}: Leaderboard is not ordered by total`,
    );
    invariants.check(
      entry.totalScore === totals.get(entry.participantId),
      `${who}: total for ${entry.displayName} differs from revealed Round points`,
    );
    const before = previousRanks?.get(entry.participantId);
    const expectedMovement = before === undefined ? null : before - entry.rank;
    invariants.check(
      entry.movement === expectedMovement,
      `${who}: movement for ${entry.displayName} differs`,
    );
    invariants.check(!ranks.has(entry.participantId), `${who}: ${entry.displayName} listed twice`);
    ranks.set(entry.participantId, entry.rank);
    previousTotal = entry.totalScore;
  });
  return ranks;
}

export interface ExpectedFinal {
  displayName: string;
  correctAnswers: number;
}

/** Checks the saved results: one per joined Participant, totals equal to the revealed points. */
export function checkFinalResults(
  invariants: Invariants,
  results: readonly FinalResult[],
  totals: ReadonlyMap<string, number>,
  finalRanks: ReadonlyMap<string, number>,
  expected: ReadonlyMap<string, ExpectedFinal>,
  questionCount: number,
): void {
  invariants.check(
    results.length === totals.size,
    "Final results do not cover every Participant once",
  );
  const seen = new Set<string>();
  for (const result of results) {
    const who = `Final result for ${result.displayName}`;
    invariants.check(!seen.has(result.participantId), `${who} is duplicated`);
    seen.add(result.participantId);
    invariants.check(
      result.totalScore === totals.get(result.participantId),
      `${who}: total differs`,
    );
    invariants.check(result.rank === finalRanks.get(result.participantId), `${who}: rank differs`);
    invariants.check(result.totalQuestions === questionCount, `${who}: Question count differs`);
    const plan = expected.get(result.participantId);
    invariants.check(plan?.displayName === result.displayName, `${who}: name differs`);
    invariants.check(
      result.correctAnswers === plan?.correctAnswers,
      `${who}: correct Answers differ`,
    );
  }
}
