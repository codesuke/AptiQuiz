import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { authPrimaryButtonClassName } from "@/components/auth/form-styles";

export const metadata: Metadata = { title: "Password updated — AptiQuiz" };

export default function PasswordResetSuccessPage() {
  return (
    <AuthShell
      alternateAction="Sign in"
      alternateHref="/sign-in"
      alternatePrompt="Ready to go?"
      eyebrow="Account recovery"
      subtitle="You’re ready for your next Round."
      title="Password updated."
    >
      <AuthStateIcon tone="success" />
      <p className="mt-6 text-[#4b5563]">
        Your password has been changed and your other sessions have been signed out. Sign in with
        the new password to continue.
      </p>
      <Link className={`${authPrimaryButtonClassName} mt-6`} href="/sign-in">
        Sign in
      </Link>
    </AuthShell>
  );
}
