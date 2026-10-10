import type { RoomPhase } from "@aptiquiz/contracts";
import type { LiveCue } from "./live-sound";

interface SoundState {
  readonly roomId: string;
  readonly phase: RoomPhase;
  readonly questionIndex?: number;
  readonly deadline?: number;
  readonly secondsLeft?: number;
  readonly correct?: boolean;
}

export interface SoundEvent {
  readonly cue: LiveCue;
  readonly key: string;
}

/** Stable keys make visual state changes audible once across rerenders and reconnects. */
export function soundEventsFor(state: SoundState): SoundEvent[] {
  const { roomId, phase, questionIndex, deadline, secondsLeft, correct } = state;
  if (phase === "FINISHED") return [{ cue: "finish", key: `${roomId}:FINISHED` }];
  if (questionIndex === undefined || deadline === undefined) return [];

  const events: SoundEvent[] = [];
  if (phase === "QUESTION_REVEAL") {
    events.push({
      cue: correct ? "correct" : "reveal",
      key: `${roomId}:${phase}:${questionIndex}:${deadline}:reveal`,
    });
  }
  if (
    (phase === "GETTING_READY" || phase === "QUESTION_OPEN" || phase === "QUESTION_REVEAL") &&
    secondsLeft !== undefined &&
    secondsLeft >= 1 &&
    secondsLeft <= 3
  ) {
    events.push({
      cue: "tick",
      key: `${roomId}:${phase}:${questionIndex}:${deadline}:${secondsLeft}`,
    });
  }
  return events;
}
