export interface EventRateLimitPolicy {
  /** Events a socket may send at once before it must wait. */
  readonly burst: number;
  /** Events returned to the budget for each second of server time. */
  readonly refillPerSecond: number;
}

const MS_PER_SECOND = 1_000;

/**
 * A token bucket for one socket: each event spends one token, and server time refills the
 * budget up to the burst size. Returns whether the next event is within the limit.
 */
export function createEventRateLimit(
  { burst, refillPerSecond }: EventRateLimitPolicy,
  now: () => number,
): () => boolean {
  let tokens = burst;
  let refilledAt = now();

  return () => {
    const time = now();
    const refill = ((time - refilledAt) * refillPerSecond) / MS_PER_SECOND;
    tokens = Math.min(burst, tokens + refill);
    refilledAt = time;

    if (tokens < 1) {
      return false;
    }

    tokens -= 1;
    return true;
  };
}
