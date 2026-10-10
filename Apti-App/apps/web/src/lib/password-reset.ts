import { HTTP_OK, HTTP_TOO_MANY_REQUESTS } from "./request-outcome";

const SECONDS_PER_MINUTE = 60;
export const PASSWORD_RESET_LINK_LIFETIME_SECONDS = 60 * SECONDS_PER_MINUTE;
export const PASSWORD_RESET_PAGE_PATH = "/reset-password";
export const PASSWORD_RESET_SUCCESS_PATH = `${PASSWORD_RESET_PAGE_PATH}/success`;

const INVALID_TOKEN_CODE = "INVALID_TOKEN";
export const EXPIRED_RESET_LINK_PATH = `${PASSWORD_RESET_PAGE_PATH}?error=${INVALID_TOKEN_CODE}`;

type SearchParamValue = string | string[] | undefined;

export type ResetLinkState = { kind: "ready"; token: string } | { kind: "expired" };
export type ResetPasswordOutcome = "updated" | "expired" | "rate-limited" | "failed";

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

function hasErrorCode(body: unknown, code: string) {
  return typeof body === "object" && body !== null && "code" in body && body.code === code;
}

export function readResetPasswordOutcome(status: number, body: unknown): ResetPasswordOutcome {
  if (status === HTTP_OK) return "updated";
  if (status === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (hasErrorCode(body, INVALID_TOKEN_CODE)) return "expired";
  return "failed";
}
