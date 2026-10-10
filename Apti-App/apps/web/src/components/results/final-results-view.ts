import type { FinalResult } from "@aptiquiz/contracts";

export const UNAVAILABLE_LABEL = "—";
export const AVERAGE_TIME_LABEL = "Average Effective Response Time";
const MS_PER_SECOND = 1000;

/** Whole-number percentage; 0 when there is nothing to divide by. */
export function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** "3/5 (60%)": counts first so the figure never relies on the percentage alone. */
export function accuracyLabel(correct: number, total: number): string {
  return `${correct}/${total} (${percent(correct, total)}%)`;
}

/** "420 ms" below one second, "1.2 s" above; a dash when no Answer was accepted. */
export function averageTimeLabel(ms: number | null): string {
  if (ms === null) return UNAVAILABLE_LABEL;
  if (ms < MS_PER_SECOND) return `${ms} ms`;
  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
}

export function topicLabel(topic: FinalResult["topics"][number]): string {
  return `${topic.topic}: ${accuracyLabel(topic.correct, topic.total)}`;
}

/** True for the viewer's own row; the Host has no Participant id and matches nothing. */
export function isOwnResult(result: Pick<FinalResult, "participantId">, viewerId: string | null) {
  return viewerId !== null && result.participantId === viewerId;
}
