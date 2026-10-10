import { headers } from "next/headers";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { authPrimaryButtonClassName } from "@/components/auth/form-styles";
import { ResendVerificationForm } from "@/components/auth/verification-resend";
import { getActiveSession } from "@/lib/auth";
import {
  VERIFICATION_LINK_LIFETIME_SECONDS,
  type VerificationPageState,
  verificationPageState,
} from "@/lib/email-verification";

export const dynamic = "force-dynamic";

const SECONDS_PER_HOUR = 3600;
const linkLifetimeHours = VERIFICATION_LINK_LIFETIME_SECONDS / SECONDS_PER_HOUR;

/** AuthShell props shared by every email verification state. */
const emailVerificationShell = {
  alternateAction: "Go to AptiQuiz",
  alternateHref: "/",
  alternatePrompt: "Ready to play?",
  eyebrow: "Email verification",
} as const;

type ResendState = Exclude<VerificationPageState, "verified" | "signed-out">;

const resendCopy: Record<ResendState, { title: string; subtitle: string }> = {
  unverified: {
    title: "Your email is not verified yet.",
    subtitle: "Open the link we sent you, or request a new one below.",
  },
  expired: {
    title: "This link has expired.",
    subtitle: `Verification links work for ${linkLifetimeHours} hour. Request a new one below.`,
  },
  invalid: {
    title: "This link is not valid.",
    subtitle: "It may be incomplete or already replaced by a newer link. Request a new one below.",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ [key: string]: string | string[] | undefined }> }>) {
  const session = await getActiveSession(await headers());
  const state = verificationPageState((await searchParams).error, session);

  if (state === "verified") {
    return (
      <AuthShell
        {...emailVerificationShell}
        subtitle="Your results can now earn College League points."
        title="Email verified."
      >
        <AuthStateIcon tone="success" />
        <Link className={`${authPrimaryButtonClassName} mt-8`} href="/">
          Continue to AptiQuiz
        </Link>
      </AuthShell>
    );
  }

  if (state === "signed-out") {
    return (
      <AuthShell
        {...emailVerificationShell}
        subtitle="If you just opened a verification link, sign in to see if your email is verified."
        title="Sign in to check your verification status."
      >
        <Link className={`${authPrimaryButtonClassName} mt-8`} href="/sign-in">
          Sign in
        </Link>
      </AuthShell>
    );
  }

  const { title, subtitle } = resendCopy[state];
  return (
    <AuthShell {...emailVerificationShell} subtitle={subtitle} title={title}>
      <AuthStateIcon tone="error" />
      <ResendVerificationForm defaultEmail={session?.user.email ?? ""} />
    </AuthShell>
  );
}
