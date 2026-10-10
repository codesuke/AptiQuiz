"use client";

import { type FormEvent, useState } from "react";
import { type ResendOutcome, resendOutcome, VERIFY_EMAIL_PAGE } from "@/lib/email-verification";

type ResendStatus = "idle" | "sending" | ResendOutcome;

const failureMessages: Partial<Record<ResendStatus, string>> = {
  rate_limited: "Too many requests. Wait a few minutes, then try again.",
  failed: "We could not send the email. Try again in a moment.",
};

const actionButtonClassName =
  "rounded-full bg-[#b84700] px-5 font-medium text-white transition hover:bg-[#993a00] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]";

function useVerificationResend() {
  const [status, setStatus] = useState<ResendStatus>("idle");

  async function resend(email: string) {
    setStatus("sending");
    try {
      // Better Auth validates this mounted public endpoint at runtime.
      const response = await fetch("/api/auth/send-verification-email", {
        body: JSON.stringify({ callbackURL: VERIFY_EMAIL_PAGE, email }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setStatus(resendOutcome(response.status));
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
          className={`min-h-11 ${actionButtonClassName}`}
          disabled={status === "sending"}
          onClick={() => resend(email)}
          type="button"
        >
          {status === "sending" ? "Sending…" : "Resend verification email"}
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
      <label className="mb-2 block text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        autoComplete="email"
        className="min-h-[52px] w-full rounded-lg border border-[#e5e7eb] bg-transparent px-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]"
        defaultValue={defaultEmail}
        id="email"
        name="email"
        required
        type="email"
      />
      <button
        className={`mt-6 min-h-[52px] w-full ${actionButtonClassName}`}
        disabled={status === "sending"}
        type="submit"
      >
        {status === "sending" ? "Sending…" : "Resend verification email"}
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
