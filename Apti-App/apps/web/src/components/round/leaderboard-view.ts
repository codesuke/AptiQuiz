import type { LeaderboardEntry } from "@aptiquiz/contracts";

export const FIRST_ROUND_MOVEMENT_LABEL = "—";

export interface MovementView {
  /** Visible text; never relies on color alone. */
  readonly text: string;
  readonly ariaLabel: string;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Movement as text plus a spoken label; null means the first Round, which has no change. */
export function movementView(movement: number | null): MovementView {
  if (movement === null) return { text: FIRST_ROUND_MOVEMENT_LABEL, ariaLabel: "No previous rank" };
  if (movement > 0) {
    return { text: `▲ ${movement}`, ariaLabel: `Up ${plural(movement, "place")}` };
  }
  if (movement < 0) {
    return { text: `▼ ${-movement}`, ariaLabel: `Down ${plural(-movement, "place")}` };
  }
  return { text: "=", ariaLabel: "Rank unchanged" };
}

/** True for the viewer's own row; the Host has no Participant id and matches nothing. */
export function isOwnRow(entry: Pick<LeaderboardEntry, "participantId">, viewerId: string | null) {
  return viewerId !== null && entry.participantId === viewerId;
}
