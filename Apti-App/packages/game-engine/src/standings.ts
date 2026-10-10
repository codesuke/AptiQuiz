export interface Standing {
  readonly participantId: string;
  /** Server time the Participant joined the Lobby. */
  readonly joinedAt: number;
  readonly totalScore: number;
  /** Sum of Effective Response Times of accepted correct Answers. */
  readonly correctResponseMs: number;
}

export interface RankedStanding extends Standing {
  /** 1..n; the order is total, so no two Participants share a rank. */
  readonly rank: number;
  /** Previous completed Round rank minus current rank; null without previous standings. */
  readonly movement: number | null;
}

/** Total order: score desc, then correct response time asc, then join time asc, then ID asc. */
export function rankStandings(
  current: readonly Standing[],
  previous: readonly Standing[] | null,
): RankedStanding[] {
  const previousRanks = previous === null ? null : ranksById(previous);

  return sortStandings(current).map((standing, index) => {
    const rank = index + 1;
    const previousRank = previousRanks?.get(standing.participantId);
    return { ...standing, rank, movement: previousRank === undefined ? null : previousRank - rank };
  });
}

function ranksById(standings: readonly Standing[]): Map<string, number> {
  return new Map(
    sortStandings(standings).map(({ participantId }, index) => [participantId, index + 1]),
  );
}

function sortStandings(standings: readonly Standing[]): Standing[] {
  return [...standings].sort(
    (left, right) =>
      right.totalScore - left.totalScore ||
      left.correctResponseMs - right.correctResponseMs ||
      left.joinedAt - right.joinedAt ||
      compareIds(left.participantId, right.participantId),
  );
}

function compareIds(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}
