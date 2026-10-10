import { MAX_ROOM_PARTICIPANTS } from "@aptiquiz/contracts";

export const SCORING_RULE =
  "Correct answers earn 500–1000 points — faster answers earn more. Wrong or unanswered Questions earn 0.";

export function participantCountLabel(count: number): string {
  return `${count} / ${MAX_ROOM_PARTICIPANTS}`;
}

export function questionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "Question" : "Questions"}`;
}
