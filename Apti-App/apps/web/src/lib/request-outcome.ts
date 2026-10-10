export const HTTP_OK = 200;
export const HTTP_TOO_MANY_REQUESTS = 429;

/** What the User is told after asking Better Auth to send an auth email. */
export type RequestOutcome = "sent" | "rate-limited" | "failed";

export function readRequestOutcome(status: number): RequestOutcome {
  if (status === HTTP_OK) return "sent";
  if (status === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  return "failed";
}
