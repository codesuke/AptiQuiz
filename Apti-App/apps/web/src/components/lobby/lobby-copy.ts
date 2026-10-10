import { MAX_ROOM_PARTICIPANTS, type RoundRules } from "@aptiquiz/contracts";

const MS_PER_SECOND = 1000;

function secondsLabel(ms: number): string {
  return `${ms / MS_PER_SECOND} s`;
}

function delayRule(maxDelayCompensationMs: number): string {
  return maxDelayCompensationMs === 0
    ? "it does not adjust for network delay"
    : `it subtracts up to ${maxDelayCompensationMs} ms of measured network delay`;
}

/** The scoring and timing rules shown before play, built from the Game Server's values. */
export function scoringRuleText(rules: RoundRules): string {
  return [
    `Each Question lasts ${secondsLabel(rules.roundDurationMs)}.`,
    "A correct Answer earns 500–1000 points: faster earns more.",
    "A wrong or missing Answer earns 0.",
    `The Game Server times every Answer; ${delayRule(rules.maxDelayCompensationMs)} and rounds response time down to ${rules.scoreBucketMs} ms steps.`,
    "An Answer that arrives after the deadline does not count.",
  ].join(" ");
}

export function scoringSummaryText(): string {
  return "Correct answers earn 500–1000 points. Faster answers score more; wrong or missing answers earn 0.";
}

export function joinedRoomHeading(joined: boolean): string {
  return joined ? "You’re in the Room" : "Join the Lobby";
}

export function participantCountLabel(count: number): string {
  return `${count} / ${MAX_ROOM_PARTICIPANTS}`;
}

export function participantsLabel(count: number): string {
  return `${count} ${count === 1 ? "player" : "players"}`;
}

export function questionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "Question" : "Questions"}`;
}
