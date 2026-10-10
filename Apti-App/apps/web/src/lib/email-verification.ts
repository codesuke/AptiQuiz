import type { MailMessage } from "./mail-sender";

/** Same-origin page that shows the result of following a verification link. */
export const VERIFY_EMAIL_PAGE = "/verify-email";

export const VERIFICATION_LINK_LIFETIME_SECONDS = 60 * 60;

export type VerificationLinkState = "verified" | "expired" | "invalid";

interface VerificationEmailInput {
  name: string;
  email: string;
  url: string;
}

function linkToResultPage(verificationUrl: string) {
  const url = new URL(verificationUrl);
  url.searchParams.set("callbackURL", VERIFY_EMAIL_PAGE);
  return url.toString();
}

export function buildVerificationEmail({ name, email, url }: VerificationEmailInput): MailMessage {
  const lifetimeHours = VERIFICATION_LINK_LIFETIME_SECONDS / 3600;
  return {
    to: email,
    subject: "Verify your AptiQuiz email",
    text: [
      `Hi ${name},`,
      "",
      "Confirm your email so your results can earn College League points:",
      linkToResultPage(url),
      "",
      `This link expires in ${lifetimeHours} hour. You can request a new one from AptiQuiz.`,
      "If you did not create an AptiQuiz account, you can ignore this email.",
    ].join("\n"),
  };
}

/** Maps the `error` query parameter Better Auth adds on a failed verification. */
export function verificationLinkState(error: string | string[] | undefined): VerificationLinkState {
  if (error === undefined) return "verified";
  return error === "TOKEN_EXPIRED" ? "expired" : "invalid";
}

export function needsEmailVerification<Session extends { user: { emailVerified: boolean } }>(
  session: Session | null,
): session is Session {
  return session !== null && !session.user.emailVerified;
}

export type ResendOutcome = "sent" | "rate_limited" | "failed";

const HTTP_OK = 200;
const HTTP_TOO_MANY_REQUESTS = 429;

export function resendOutcome(status: number): ResendOutcome {
  if (status === HTTP_OK) return "sent";
  return status === HTTP_TOO_MANY_REQUESTS ? "rate_limited" : "failed";
}
