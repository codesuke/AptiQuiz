/** Timing values applied equally to every Participant of a Round. */
export interface TimingPolicy {
  readonly durationMs: number;
  /** Most one-way network delay subtracted from an Answer's elapsed time for scoring. */
  readonly maxCompensationMs: number;
  /** Effective Response Times are floored to this step so near-equal Answers score equally. */
  readonly bucketMs: number;
}

export interface RoundWindow {
  readonly startsAt: number;
  readonly endsAt: number;
}

/** When an Answer arrived relative to its Round, and the sender's measured delay. */
export interface AnswerTiming {
  readonly startsAt: number;
  readonly receivedAt: number;
  readonly medianRttMs: number | null;
}

export interface ScoredAnswer {
  readonly correct: boolean;
  readonly effectiveResponseMs: number;
}

const MIN_CORRECT_SCORE = 500;
const SPEED_BONUS_RANGE = 500;

/** Uses server receipt time only; delay compensation never makes a late Answer valid. */
export function isAnswerOnTime(round: RoundWindow, receivedAt: number): boolean {
  return receivedAt >= round.startsAt && receivedAt <= round.endsAt;
}

/** Median of the valid round-trip samples, or null when no sample is valid. */
export function medianRoundTrip(samples: readonly number[]): number | null {
  const valid = samples.filter(isValidSample).sort((left, right) => left - right);

  if (valid.length === 0) {
    return null;
  }

  const middle = Math.floor(valid.length / 2);
  const upper = valid[middle] ?? 0;
  return valid.length % 2 === 1 ? upper : ((valid[middle - 1] ?? upper) + upper) / 2;
}

export function effectiveResponseTime(policy: TimingPolicy, timing: AnswerTiming): number {
  const { startsAt, receivedAt, medianRttMs } = timing;
  const compensationMs =
    medianRttMs === null ? 0 : Math.min(medianRttMs / 2, policy.maxCompensationMs);
  const compensatedMs = clamp(receivedAt - startsAt - compensationMs, 0, policy.durationMs);
  return Math.floor(compensatedMs / policy.bucketMs) * policy.bucketMs;
}

/** A correct Answer earns `calculateScore`; a wrong Answer earns zero. */
export function scoreAnswer(policy: TimingPolicy, answer: ScoredAnswer): number {
  return answer.correct ? calculateScore(answer.effectiveResponseMs, policy.durationMs) : 0;
}

/** `500 + floor(500 × (1 − elapsed / duration))`, with elapsed clamped to the duration. */
export function calculateScore(effectiveElapsedMs: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("durationMs must be greater than zero");
  }

  const remainingRatio = 1 - clamp(effectiveElapsedMs / durationMs, 0, 1);
  return MIN_CORRECT_SCORE + Math.floor(SPEED_BONUS_RANGE * remainingRatio);
}

function isValidSample(sample: number): boolean {
  return Number.isFinite(sample) && sample >= 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
