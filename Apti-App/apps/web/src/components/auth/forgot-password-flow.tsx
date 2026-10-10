"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { readResetRequestOutcome } from "@/lib/password-reset";
import { accountRecoveryShell } from "./account-recovery-shell";
import { AuthShell } from "./auth-shell";
import { AuthStateIcon } from "./auth-state-icon";
import {
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authStatusClassName,
  authTextLinkClassName,
} from "./form-styles";

const failureMessages = {
  "rate-limited": "Too many reset requests. Wait a few minutes and try again.",
  failed: "We could not send a reset link. Check the email and try again.",
} as const;

export function ForgotPasswordFlow() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo !== null) {
    return <ResetEmailConfirmation email={sentTo} onTryAnotherEmail={() => setSentTo(null)} />;
  }

  return (
    <AuthShell
      {...accountRecoveryShell}
      subtitle="Enter your email and we’ll help you reset it."
      title="Forgot your password?"
    >
      <ResetRequestForm onSent={setSentTo} />
      <Link className={`${authTextLinkClassName} mt-4`} href="/sign-in">
        Back to sign in
      </Link>
    </AuthShell>
  );
}

function ResetRequestForm({ onSent }: { onSent: (email: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    try {
      // Better Auth validates this mounted public endpoint at runtime.
      const response = await fetch("/api/auth/request-password-reset", {
        body: JSON.stringify({ email }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const outcome = readResetRequestOutcome(response.status);
      if (outcome === "sent") onSent(email);
      else setError(failureMessages[outcome]);
    } catch {
      setError(failureMessages.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={submit}>
      <div className="mb-6">
        <label className={authLabelClassName} htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={authInputClassName}
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>
      <button className={authPrimaryButtonClassName} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>
      <p aria-live="polite" className={authStatusClassName} role="status">
        {error}
      </p>
    </form>
  );
}

function ResetEmailConfirmation({
  email,
  onTryAnotherEmail,
}: {
  email: string;
  onTryAnotherEmail: () => void;
}) {
  return (
    <AuthShell
      {...accountRecoveryShell}
      subtitle="Your next step is in your email."
      title="Check your inbox."
    >
      <AuthStateIcon tone="success" />
      <div className="mt-6 space-y-3 text-[#4b5563]" role="status">
        <p>
          If an account exists for{" "}
          <strong className="break-all font-medium text-[#111827]">{email}</strong>, you’ll receive
          a password reset link.
        </p>
        <p>Check your spam folder if you don’t see it.</p>
      </div>
      <Link className={`${authPrimaryButtonClassName} mt-6`} href="/sign-in">
        Back to sign in
      </Link>
      <button className={`${authTextLinkClassName} mt-4`} onClick={onTryAnotherEmail} type="button">
        Try another email
      </button>
    </AuthShell>
  );
}
