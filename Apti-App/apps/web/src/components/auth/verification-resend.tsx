"use client";

import { type FormEvent, useState } from "react";
import { postAuthJson } from "@/lib/auth-request";
import { VERIFY_EMAIL_PAGE } from "@/lib/email-verification";
import { type RequestOutcome, readRequestOutcome } from "@/lib/request-outcome";
import { authInputClassName, authLabelClassName, authPrimaryButtonClassName } from "./form-styles";

type ResendStatus = "idle" | "sending" | RequestOutcome;

const failureMessages: Partial<Record<ResendStatus, string>> = {
  "rate-limited": "Too many requests. Wait a few minutes, then try again.",
  failed: "We could not send the email. Try again in a moment.",
};

function useVerificationResend() {
  const [status, setStatus] = useState<ResendStatus>("idle");

  async function resend(email: string) {
    setStatus("sending");
    try {
      const response = await postAuthJson("/send-verification-email", {
        callbackURL: VERIFY_EMAIL_PAGE,
        email,
      });
      setStatus(readRequestOutcome(response.status));
    } catch {
      setStatus("failed");
    }
  }

  return { resend, status };
}

function ResendFeedback({ status, sentMessage }: { status: ResendStatus; sentMessage: string }) {
  const message = status === "sent" ? sentMessage : failureMessages[status];
  const tone = status === "sent" ? "text-[#4b5563]" : "text-red-700";
  return (
    <p aria-live="polite" className={`min-h-6 text-sm ${tone}`} role="status">
      {message}
    </p>
  );
}

function resendButtonLabel(status: ResendStatus) {
  return status === "sending" ? "Sending…" : "Resend verification email";
}

export function EmailVerificationNotice({ email }: Readonly<{ email: string }>) {
  const { resend, status } = useVerificationResend();

  return (
    <section
      aria-labelledby="verify-email-notice-title"
      className="mt-6 rounded-2xl border border-[#ffb380] bg-[#fff5e6] p-5 text-stone-900"
    >
      <h2 className="font-semibold" id="verify-email-notice-title">
        Verify your email
      </h2>
      <p className="mt-1 text-sm leading-6 text-stone-700">
        Verification is needed to earn College League points. We sent a link to{" "}
        <span className="font-medium break-all">{email}</span>. You can still play and host while
        you wait.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          className={`${authPrimaryButtonClassName} sm:w-auto`}
          disabled={status === "sending"}
          onClick={() => resend(email)}
          type="button"
        >
          {resendButtonLabel(status)}
        </button>
        <ResendFeedback sentMessage="Sent. Check your inbox for a new link." status={status} />
      </div>
    </section>
  );
}

export function ResendVerificationForm({ defaultEmail }: Readonly<{ defaultEmail: string }>) {
  const { resend, status } = useVerificationResend();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void resend(String(formData.get("email") ?? ""));
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
          defaultValue={defaultEmail}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <button className={authPrimaryButtonClassName} disabled={status === "sending"} type="submit">
        {resendButtonLabel(status)}
      </button>
      <div className="mt-4">
        <ResendFeedback
          sentMessage="If that account still needs verification, a new link is on its way. Check your inbox and spam folder."
          status={status}
        />
      </div>
    </form>
  );
}
