import { describeGoogleSignInError, isGoogleSignInAvailable } from "@/lib/google-sign-in";
import { GoogleSignInButton } from "./google-sign-in-button";

interface GoogleSignInProps {
  errorPath: "/sign-in" | "/sign-up";
  /** The `error` query parameter Better Auth adds when the Google callback fails. */
  errorCode: string | string[] | undefined;
}

/** Renders nothing when Google credentials are not configured, so the email form stays usable. */
export function GoogleSignIn({ errorPath, errorCode }: GoogleSignInProps) {
  if (!isGoogleSignInAvailable()) return null;

  const code = Array.isArray(errorCode) ? errorCode[0] : errorCode;
  return (
    <GoogleSignInButton errorPath={errorPath} initialError={describeGoogleSignInError(code)} />
  );
}
