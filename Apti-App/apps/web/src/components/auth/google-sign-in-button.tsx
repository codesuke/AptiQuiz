"use client";

import { useState } from "react";
import { postAuthJson } from "@/lib/auth-request";

interface GoogleSignInButtonProps {
  /** The auth page that shows a failed Google sign-in. */
  errorPath: "/sign-in" | "/sign-up";
  initialError: string | null;
}

const startError = "We could not start Google sign-in. Try again.";

export function GoogleSignInButton({ errorPath, initialError }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState(initialError);

  async function continueWithGoogle() {
    setError(null);
    setIsRedirecting(true);

    try {
      const response = await postAuthJson("/sign-in/social", {
        callbackURL: "/",
        disableRedirect: true,
        errorCallbackURL: errorPath,
        provider: "google",
      });
      const result: unknown = response.ok ? await response.json() : null;
      const url =
        result && typeof result === "object" && "url" in result && typeof result.url === "string"
          ? result.url
          : null;
      if (!url) throw new Error("Missing Google authorization URL");

      window.location.assign(url);
    } catch {
      setError(startError);
      setIsRedirecting(false);
    }
  }

  return (
    <div>
      <div className="my-7 flex items-center gap-4 text-sm text-[#4b5563] before:h-px before:flex-1 before:bg-[#e5e7eb] after:h-px after:flex-1 after:bg-[#e5e7eb]">
        or
      </div>
      <button
        className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-lg border border-[#b7b8bd] bg-transparent px-5 font-medium transition hover:bg-[#f7f4eb] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
        disabled={isRedirecting}
        onClick={continueWithGoogle}
        type="button"
      >
        <GoogleMark />
        {isRedirecting ? "Opening Google…" : "Continue with Google"}
      </button>
      <p aria-live="polite" className="mt-4 min-h-6 text-sm text-red-700" role="status">
        {error}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" focusable="false" viewBox="0 0 48 48">
      <path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        fill="#FFC107"
      />
      <path
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        fill="#1976D2"
      />
    </svg>
  );
}
