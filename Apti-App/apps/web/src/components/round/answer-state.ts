import type { LockedAnswer, PublicQuestion, RoundView } from "@aptiquiz/contracts";
import { keyForScope } from "../../lib/scoped-key";

/**
 * One idempotency key per Room and Question. A retry after a lost acknowledgement reuses it,
 * so the Game Server returns the first result instead of recording a second Answer.
 */
export function answerKeyFor(
  keys: Map<string, string>,
  view: Pick<RoundView, "roomId" | "questionIndex">,
  createKey: () => string,
): string {
  return keyForScope(keys, `${view.roomId}:${view.questionIndex}`, createKey);
}

/** The server's record wins (rejoin, `round:state`); otherwise this tab's accepted Answer. */
export function lockedAnswerFor(
  view: RoundView,
  accepted: LockedAnswer | null,
): LockedAnswer | null {
  if (view.answer !== null) return view.answer;
  return accepted?.questionIndex === view.questionIndex ? accepted : null;
}

export function lockedAnswerLabel(question: PublicQuestion, answer: LockedAnswer): string {
  const option = question.options.find(({ id }) => id === answer.optionId);
  return option === undefined ? "Answer locked." : `Answer locked: ${option.text}`;
}

interface AnswerAvailability {
  readonly locked: boolean;
  readonly pending: boolean;
  /** A definite refusal (late, already answered, …): another click cannot succeed. */
  readonly refused: boolean;
  readonly timeUp: boolean;
  readonly online: boolean;
}

export function canSubmitAnswer(state: AnswerAvailability): boolean {
  return state.online && !state.locked && !state.pending && !state.refused && !state.timeUp;
}
