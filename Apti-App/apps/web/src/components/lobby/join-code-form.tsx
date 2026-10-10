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
      className="relative w-full max-w-[40.5rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[var(--aq-ink)] p-7 text-white shadow-[0_32px_80px_-36px_rgba(18,42,34,0.72)] sm:p-12 lg:min-h-[41rem] lg:p-16"
      noValidate
      onSubmit={handleSubmit}
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 size-52 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-8 size-24 rounded-full bg-[#e65c00]/20 blur-2xl"
      />
      <p className="relative mb-10 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aq-text-on-dark)]">
        <span className="h-px w-8 bg-[#ff9b5b]" /> Join a live quiz
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
      <div className="relative mt-5">
        <input
          aria-describedby={errorId}
          aria-invalid={error !== null}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          className={`${textInputClass} min-h-20 border-white/20 bg-white/95 font-mono text-2xl uppercase tracking-[0.3em] shadow-inner sm:text-3xl`}
          id={inputId}
          inputMode="text"
          maxLength={JOIN_CODE_LENGTH}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="AB3CD9"
          spellCheck={false}
          value={code}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 font-mono text-xs tracking-[0.18em] text-[#627169] sm:block"
        >
          6 CHARACTERS
        </span>
      </div>
      <p
        aria-live="polite"
        className="mt-2 min-h-6 text-sm font-medium text-[#ffbd91]"
        id={errorId}
      >
        {error}
      </p>
      <button
        className={`${primaryButtonClass} mt-5 min-h-18 w-full rounded-full text-lg shadow-[0_14px_30px_-16px_rgba(0,0,0,0.75)]`}
        type="submit"
      >
        Find Room
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      <p className="mt-10 border-t border-white/20 pt-9 text-center text-base text-[var(--aq-text-on-dark)]">
        No account needed. Just a code and you’re in.
      </p>
    </form>
  );
}
