import type { LobbySnapshot, RoomError, RoundView } from "@aptiquiz/contracts";
import { keyForScope } from "../../lib/scoped-key";
import { isMatchFinished } from "../round/round-view";

type QuestionPosition = Pick<RoundView, "questionIndex" | "questionCount">;

/** The Host's advance outcome for the revealed Question it was sent from. */
export interface AdvanceAttempt {
  readonly questionIndex: number;
  readonly pending: boolean;
  readonly error: RoomError | null;
}

export type AdvanceState = Pick<AdvanceAttempt, "pending" | "error">;

export const NO_ADVANCE: AdvanceState = { pending: false, error: null };

export function isLastQuestion({ questionIndex, questionCount }: QuestionPosition): boolean {
  return questionIndex + 1 === questionCount;
}

/** "Finish match" after the last Question, otherwise "Next question". */
export function advanceLabel(round: QuestionPosition): string {
  return isLastQuestion(round) ? "Finish match" : "Next question";
}

export function advancePendingLabel(round: QuestionPosition): string {
  return isLastQuestion(round) ? "Finishing…" : "Opening…";
}

export function advancePrompt(round: RoundView): string {
  return round.phase === "QUESTION_OPEN"
    ? "Answers will be revealed after the timer ends."
    : "The results are visible. Continue when your players are ready.";
}

/** The Host may advance only from a revealed Round of a Room that has not finished. */
export function canAdvance(lobby: LobbySnapshot | null, round: RoundView | null): boolean {
  return round?.phase === "QUESTION_REVEAL" && !isMatchFinished(lobby);
}

/**
 * One idempotency key per Room and revealed Question. A double click or a retry after a lost
 * acknowledgement reuses it, so the Game Server cannot skip a Question or open two Rounds.
 */
export function advanceKeyFor(
  keys: Map<string, string>,
  round: Pick<RoundView, "roomId" | "questionIndex">,
  createKey: () => string,
): string {
  return keyForScope(keys, `${round.roomId}:${round.questionIndex}`, createKey);
}

/** The attempt for the shown Question; an attempt from an earlier Question no longer applies. */
export function currentAdvance(
  attempt: AdvanceAttempt | null,
  round: Pick<RoundView, "questionIndex"> | null,
): AdvanceState {
  return attempt !== null && attempt.questionIndex === round?.questionIndex ? attempt : NO_ADVANCE;
}
