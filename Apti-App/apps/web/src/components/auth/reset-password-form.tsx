"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { postAuthJson } from "@/lib/auth-request";
import {
  EXPIRED_RESET_LINK_PATH,
  PASSWORD_RESET_SUCCESS_PATH,
  readResetPasswordOutcome,
} from "@/lib/password-reset";
import { authPrimaryButtonClassName, authStatusClassName } from "./form-styles";
import { PasswordField } from "./password-field";

const failureMessages = {
  mismatch: "The passwords do not match.",
  "rate-limited": "Too many attempts. Wait a minute and try again.",
  failed: "We could not update your password. Use 8 to 128 characters and try again.",
} as const;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "");
    if (newPassword !== String(formData.get("confirm-password") ?? "")) {
      setError(failureMessages.mismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await postAuthJson("/reset-password", { newPassword, token });
      const outcome = readResetPasswordOutcome(response.status, await readJson(response));
      if (outcome === "updated") router.replace(PASSWORD_RESET_SUCCESS_PATH);
      else if (outcome === "expired") router.replace(EXPIRED_RESET_LINK_PATH);
      else setError(failureMessages[outcome]);
    } catch {
      setError(failureMessages.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={submit}>
      <PasswordField autoComplete="new-password" id="password" label="Password" />
      <PasswordField autoComplete="new-password" id="confirm-password" label="Confirm password" />
      <button className={authPrimaryButtonClassName} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Updating…" : "Update password"}
      </button>
      <p aria-live="polite" className={authStatusClassName} role="status">
        {error}
      </p>
    </form>
  );
}
