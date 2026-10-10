import type { RevealedRound } from "@aptiquiz/contracts";
import { isOwnRow } from "./leaderboard-view";

export type PersonalOutcome = "correct" | "wrong" | "no_answer";

export interface PersonalStanding {
  readonly rank: number;
  readonly participantCount: number;
  /** Previous rank minus current rank, as sent by the server; null after the first Round. */
  readonly movement: number | null;
}

export interface PersonalResult {
  readonly outcome: PersonalOutcome;
  readonly headline: string;
  /** The Round points the server revealed for this Participant. */
  readonly points: number;
  /** Null only if the server Leaderboard has no row for this Participant. */
  readonly standing: PersonalStanding | null;
}

const HEADLINES: Record<PersonalOutcome, string> = {
  correct: "Correct",
  wrong: "Wrong",
  no_answer: "No answer",
};

function outcomeOf(view: RevealedRound, correct: boolean): PersonalOutcome {
  if (view.answer === null) return "no_answer";
  return correct ? "correct" : "wrong";
}

/**
 * The viewing Participant's revealed result and standing, read from the server's reveal;
 * null for the Host, who has no result. It never recalculates points or ranks.
 */
export function personalResult(view: RevealedRound, viewerId: string): PersonalResult | null {
  if (view.result === null) return null;
  const outcome = outcomeOf(view, view.result.correct);
  const entry = view.leaderboard.find((row) => isOwnRow(row, viewerId));
  return {
    outcome,
    headline: HEADLINES[outcome],
    points: view.result.points,
    standing: entry
      ? {
          rank: entry.rank,
          participantCount: view.leaderboard.length,
          movement: entry.movement,
        }
      : null,
  };
}
