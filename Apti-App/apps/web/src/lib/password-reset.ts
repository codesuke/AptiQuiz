import type { MailMessage } from "./mail-sender";

const SECONDS_PER_MINUTE = 60;
export const PASSWORD_RESET_LINK_LIFETIME_SECONDS = 60 * SECONDS_PER_MINUTE;
export const PASSWORD_RESET_PAGE_PATH = "/reset-password";
export const PASSWORD_RESET_SUCCESS_PATH = `${PASSWORD_RESET_PAGE_PATH}/success`;

const HTTP_OK = 200;
const HTTP_TOO_MANY_REQUESTS = 429;
const INVALID_TOKEN_CODE = "INVALID_TOKEN";
export const EXPIRED_RESET_LINK_PATH = `${PASSWORD_RESET_PAGE_PATH}?error=${INVALID_TOKEN_CODE}`;

type SearchParamValue = string | string[] | undefined;

export type ResetLinkState = { kind: "ready"; token: string } | { kind: "expired" };
export type ResetRequestOutcome = "sent" | "rate-limited" | "failed";
export type ResetPasswordOutcome = "updated" | "expired" | "rate-limited" | "failed";

/**
 * The link opens Better Auth's token check first, so an expired or used token
 * lands on the expired-link page before the User types a new password.
 */
export function buildPasswordResetLink(baseUrl: string, token: string) {
  const origin = baseUrl.replace(/\/+$/, "");
  const callbackUrl = encodeURIComponent(PASSWORD_RESET_PAGE_PATH);
  return `${origin}/api/auth/reset-password/${encodeURIComponent(token)}?callbackURL=${callbackUrl}`;
}

export function buildPasswordResetEmail({ to, link }: { to: string; link: string }): MailMessage {
  const lifetimeMinutes = PASSWORD_RESET_LINK_LIFETIME_SECONDS / SECONDS_PER_MINUTE;
  return {
    to,
    subject: "Reset your AptiQuiz password",
    text: [
      "Someone asked to reset the password for your AptiQuiz account.",
      `Open this link to choose a new password: ${link}`,
      `The link expires in ${lifetimeMinutes} minutes and works once.`,
      "If you did not ask for a reset, you can ignore this email.",
    ].join("\n\n"),
  };
}

function isSingleToken(value: SearchParamValue): value is string {
  return typeof value === "string" && value.length > 0;
}

export function readResetLinkState(params: {
  token?: SearchParamValue;
  error?: SearchParamValue;
}): ResetLinkState {
  const { token, error } = params;
  if (error !== undefined || !isSingleToken(token)) return { kind: "expired" };
  return { kind: "ready", token };
}

export function readResetRequestOutcome(status: number): ResetRequestOutcome {
  if (status === HTTP_OK) return "sent";
  if (status === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  return "failed";
}

function hasErrorCode(body: unknown, code: string) {
  return typeof body === "object" && body !== null && "code" in body && body.code === code;
}

export function readResetPasswordOutcome(status: number, body: unknown): ResetPasswordOutcome {
  if (status === HTTP_OK) return "updated";
  if (status === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (hasErrorCode(body, INVALID_TOKEN_CODE)) return "expired";
  return "failed";
}
