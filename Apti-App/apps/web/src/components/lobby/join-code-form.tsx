"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { parseJoinCodeInput } from "@/lib/room-errors";
import { primaryButtonClass, textInputClass } from "./form-styles";

const JOIN_CODE_LENGTH = 6;

export function JoinCodeForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseJoinCodeInput(code);

    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    router.push(`/join/${parsed.value}`);
  }

  return (
    <form
      className="w-full max-w-[40.5rem] rounded-xl bg-[var(--aq-ink)] p-7 text-white shadow-[0_28px_60px_-32px_rgba(18,42,34,0.6)] sm:p-12 lg:min-h-[41rem] lg:p-16"
      noValidate
      onSubmit={handleSubmit}
    >
      <p className="mb-10 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aq-text-on-dark)]">
        Join a live quiz
      </p>
      <label
        className="block font-[family-name:var(--aq-font-display)] text-4xl text-white"
        htmlFor={inputId}
      >
        Join Code
      </label>
      <p className="mt-2 text-sm leading-6 text-[var(--aq-text-on-dark)]">
        Six letters or numbers, shown on the Host's screen.
      </p>
      <input
        aria-describedby={errorId}
        aria-invalid={error !== null}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        className={`${textInputClass} mt-5 min-h-20 border-white/20 font-mono text-2xl uppercase tracking-[0.3em] sm:text-3xl`}
        id={inputId}
        inputMode="text"
        maxLength={JOIN_CODE_LENGTH}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="AB3CD9"
        spellCheck={false}
        value={code}
      />
      <p
        aria-live="polite"
        className="mt-2 min-h-6 text-sm font-medium text-[#ffbd91]"
        id={errorId}
      >
        {error}
      </p>
      <button className={`${primaryButtonClass} mt-5 min-h-18 w-full text-lg`} type="submit">
        Find Room
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      <p className="mt-10 border-t border-white/20 pt-9 text-center text-base text-[var(--aq-text-on-dark)]">
        No account needed. Just a code and you’re in.
      </p>
    </form>
  );
}
