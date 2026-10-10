/** Same-origin page that shows the result of following a verification link. */
export const VERIFY_EMAIL_PAGE = "/verify-email";

export const VERIFICATION_LINK_LIFETIME_SECONDS = 60 * 60;

export type VerificationPageState =
  | "verified"
  | "unverified"
  | "signed-out"
  | "expired"
  | "invalid";

interface VerificationSession {
  user: { emailVerified: boolean };
}

/**
 * Combines the `error` query parameter Better Auth adds on a failed verification with the
 * signed-in User's stored status. A bare visit never claims success without a verified session.
 */
export function verificationPageState(
  error: string | string[] | undefined,
  session: VerificationSession | null,
): VerificationPageState {
  if (error !== undefined) return error === "TOKEN_EXPIRED" ? "expired" : "invalid";
  if (session === null) return "signed-out";
  return session.user.emailVerified ? "verified" : "unverified";
}

export function needsEmailVerification<Session extends VerificationSession>(
  session: Session | null,
): session is Session {
  return session !== null && !session.user.emailVerified;
}
