import type { RoundView } from "@aptiquiz/contracts";

/**
 * The Participant's total after the latest reveal. Only a revealed Round carries the
 * Leaderboard; any other view keeps the total already known, so an open Round never moves it.
 */
export function scoreAfter(known: number, view: RoundView, participantId: string): number {
  if (view.phase !== "QUESTION_REVEAL") return known;
  const entry = view.leaderboard.find((candidate) => candidate.participantId === participantId);
  return entry?.totalScore ?? known;
}
