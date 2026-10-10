import type { Metadata } from "next";
import Link from "next/link";
import { accountRecoveryShell } from "@/components/auth/account-recovery-shell";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { authPrimaryButtonClassName, authTextLinkClassName } from "@/components/auth/form-styles";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { readResetLinkState } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Reset your password — AptiQuiz",
  // The URL carries a reset token; never send it to another origin.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const linkState = readResetLinkState(await searchParams);

  if (linkState.kind === "expired") {
    return (
      <AuthShell
        {...accountRecoveryShell}
        subtitle="Request a new link to reset your password."
        title="This link has expired."
      >
        <AuthStateIcon tone="error" />
        <p className="mt-6 text-[#4b5563]">
          For your account’s security, password reset links work once and only for a limited time.
        </p>
        <Link className={`${authPrimaryButtonClassName} mt-6`} href="/forgot-password">
          Request a new link
        </Link>
        <Link className={`${authTextLinkClassName} mt-4`} href="/sign-in">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      {...accountRecoveryShell}
      subtitle="Choose a password you haven’t used before."
      title="Set a new password."
    >
      <ResetPasswordForm token={linkState.token} />
      <Link className={authTextLinkClassName} href="/sign-in">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
