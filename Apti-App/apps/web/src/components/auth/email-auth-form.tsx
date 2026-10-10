"use client";

import { type FormEvent, useState } from "react";

type AuthMode = "sign-in" | "sign-up";

interface EmailAuthFormProps {
  mode: AuthMode;
}

const genericError = "We could not complete that request. Check your details and try again.";
const inputClassName =
  "min-h-[52px] w-full rounded-lg border border-[#e5e7eb] bg-transparent px-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]";

export function EmailAuthForm({ mode }: EmailAuthFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ...(mode === "sign-up" ? { name: String(formData.get("name") ?? "") } : {}),
    };

    try {
      // Better Auth validates this mounted public endpoint at runtime.
      const response = await fetch(
        `/api/auth/${mode === "sign-in" ? "sign-in" : "sign-up"}/email`,
        {
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );

      if (!response.ok) {
        setError(genericError);
        return;
      }

      window.location.assign("/");
    } catch {
      setError(genericError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignUp = mode === "sign-up";
  const buttonLabel = isSubmitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in";

  return (
    <form className="mt-8" onSubmit={submit}>
      {isSignUp ? (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium" htmlFor="name">
            Display name
          </label>
          <input
            autoComplete="name"
            className={inputClassName}
            id="name"
            maxLength={100}
            name="name"
            required
          />
        </div>
      ) : null}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClassName}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className={inputClassName}
          id="password"
          maxLength={128}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      <button
        className="mt-6 min-h-[52px] w-full rounded-full bg-[#e65c00] px-5 font-medium text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
        disabled={isSubmitting}
        type="submit"
      >
        {buttonLabel}
      </button>
      <p aria-live="polite" className="mt-4 min-h-6 text-sm text-red-700" role="status">
        {error}
      </p>
    </form>
  );
}
