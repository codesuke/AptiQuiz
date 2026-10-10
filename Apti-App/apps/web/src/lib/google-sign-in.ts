import "server-only";

type GoogleEnvironment = Record<string, string | undefined>;

const accountNotLinkedMessage =
  "This email already has a password account that is not verified. Use “Forgot password?” to reset the password, which also verifies the email. Then Google sign-in opens the same account.";
const suspendedMessage = "This account is suspended.";
const genericGoogleErrorMessage = "We could not sign you in with Google. Try again.";

/** Google sign-in is optional: without both credentials the provider stays off. */
export function readSocialProviders(env: GoogleEnvironment = process.env) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { google: { clientId, clientSecret } } : {};
}

export function isGoogleSignInAvailable(env: GoogleEnvironment = process.env) {
  return "google" in readSocialProviders(env);
}

/** Maps the `error` query parameter of a failed OAuth callback to a message for the visitor. */
export function describeGoogleSignInError(code: string | undefined) {
  if (!code) return null;
  if (code === "account_not_linked") return accountNotLinkedMessage;
  if (code === "ACCOUNT_SUSPENDED") return suspendedMessage;
  return genericGoogleErrorMessage;
}
