import "server-only";
import { VERIFICATION_LINK_LIFETIME_SECONDS, VERIFY_EMAIL_PAGE } from "./email-verification";
import type { MailMessage } from "./mail-sender";
import { PASSWORD_RESET_LINK_LIFETIME_SECONDS, PASSWORD_RESET_PAGE_PATH } from "./password-reset";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;

interface VerificationEmailInput {
  name: string;
  email: string;
  url: string;
}

function linkToVerificationResultPage(verificationUrl: string) {
  const url = new URL(verificationUrl);
  url.searchParams.set("callbackURL", VERIFY_EMAIL_PAGE);
  return url.toString();
}

export function buildVerificationEmail({ name, email, url }: VerificationEmailInput): MailMessage {
  const lifetimeHours = VERIFICATION_LINK_LIFETIME_SECONDS / SECONDS_PER_HOUR;
  return {
    to: email,
    subject: "Verify your AptiQuiz email",
    text: [
      `Hi ${name},`,
      "",
      "Confirm your email so your results can earn College League points:",
      linkToVerificationResultPage(url),
      "",
      `This link expires in ${lifetimeHours} hour. You can request a new one from AptiQuiz.`,
      "If you did not create an AptiQuiz account, you can ignore this email.",
    ].join("\n"),
  };
}

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
