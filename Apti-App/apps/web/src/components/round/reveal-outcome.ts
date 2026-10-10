import type { RoundScore } from "@aptiquiz/contracts";

const MS_PER_SECOND = 1_000;

export interface FastestCorrect {
  readonly participantId: string;
  readonly displayName: string;
  /** The server's bucketed Effective Response Time; never a browser timing. */
  readonly effectiveResponseMs: number;
}

export interface RevealOutcome {
  readonly participantCount: number;
  readonly correctCount: number;
  /** Null when no correct Answer carries a server time, including an all-incorrect Round. */
  readonly fastestCorrect: FastestCorrect | null;
  /** The Round points the server revealed, by Participant id. */
  readonly pointsByParticipant: ReadonlyMap<string, number>;
}

type TimedCorrectScore = RoundScore & { readonly effectiveResponseMs: number };

function isTimedCorrect(score: RoundScore): score is TimedCorrectScore {
  return score.correct && typeof score.effectiveResponseMs === "number";
}

/** Keeps the earlier score on a tie, so join order breaks equal times. */
function fasterOf(best: TimedCorrectScore | null, candidate: TimedCorrectScore) {
  if (best === null || candidate.effectiveResponseMs < best.effectiveResponseMs) return candidate;
  return best;
}

/** Summarises a revealed Round from the server scores; it never recalculates points or ranks. */
export function revealOutcome(scores: readonly RoundScore[]): RevealOutcome {
  const fastest = scores.filter(isTimedCorrect).reduce<TimedCorrectScore | null>(fasterOf, null);
  return {
    participantCount: scores.length,
    correctCount: scores.filter((score) => score.correct).length,
    fastestCorrect: fastest
      ? {
          participantId: fastest.participantId,
          displayName: fastest.displayName,
          effectiveResponseMs: fastest.effectiveResponseMs,
        }
      : null,
    pointsByParticipant: new Map(scores.map((score) => [score.participantId, score.points])),
  };
}

export function formatResponseTime(effectiveResponseMs: number): string {
  return `${(effectiveResponseMs / MS_PER_SECOND).toFixed(1)} s`;
}

export function roundPointsLabel(points: number): string {
  return `+${points}`;
}
