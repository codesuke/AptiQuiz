import type { LobbySnapshot, RevealedRound } from "@aptiquiz/contracts";
import type { ReceivedRound } from "@/lib/server-clock";

export const CORRECT_OPTION_LABEL = "Correct answer";
export const YOUR_OPTION_LABEL = "Your answer";

/** The countdown text; "Time's up" stays until the reveal replaces the open view. */
export function countdownLabel(secondsLeft: number): string {
  return secondsLeft === 0 ? "Time's up" : `${secondsLeft}s left`;
}

/** Labels for one option of a revealed Round: the correct option and the receiver's own pick. */
export function revealedOptionLabels(view: RevealedRound, optionId: string): string[] {
  const labels: string[] = [];
  if (optionId === view.correctOptionId) labels.push(CORRECT_OPTION_LABEL);
  if (optionId === view.answer?.optionId) labels.push(YOUR_OPTION_LABEL);
  return labels;
}

/** An earlier Question, or an open view of a Question whose reveal already arrived. */
function isStaleView(current: ReceivedRound, incoming: ReceivedRound): boolean {
  const currentIndex = current.view.questionIndex;
  const incomingIndex = incoming.view.questionIndex;

  if (incomingIndex !== currentIndex) return incomingIndex < currentIndex;
  return current.view.phase === "QUESTION_REVEAL" && incoming.view.phase === "QUESTION_OPEN";
}

/**
 * The Round view to show after `incoming` arrives. Delayed messages never move the view
 * backwards: neither to an earlier Question nor from a reveal back to its open view.
 */
export function nextRound(current: ReceivedRound | null, incoming: ReceivedRound): ReceivedRound {
  if (current !== null && isStaleView(current, incoming)) return current;
  return incoming;
}

/** The Game Server finished the Room after its last Question. */
export function isMatchFinished(lobby: Pick<LobbySnapshot, "phase"> | null): boolean {
  return lobby?.phase === "FINISHED";
}
