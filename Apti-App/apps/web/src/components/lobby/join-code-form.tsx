"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { parseJoinCodeInput } from "@/lib/room-errors";
import { fieldErrorClass, primaryButtonClass, textInputClass } from "./form-styles";

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
      className="max-w-md rounded-2xl border border-[#e4dfd3] bg-[#f7f4eb] p-5 sm:p-7"
      noValidate
      onSubmit={handleSubmit}
    >
      <label className="block font-semibold text-[#172823]" htmlFor={inputId}>
        Join Code
      </label>
      <p className="mt-1 text-sm leading-6 text-[#526159]">
        Six letters or numbers, shown on the Host's screen.
      </p>
      <input
        aria-describedby={errorId}
        aria-invalid={error !== null}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        className={`${textInputClass} mt-3 font-mono text-2xl uppercase tracking-[0.3em]`}
        id={inputId}
        inputMode="text"
        maxLength={JOIN_CODE_LENGTH}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="AB3CD9"
        spellCheck={false}
        value={code}
      />
      <p aria-live="polite" className={`${fieldErrorClass} mt-2 min-h-6`} id={errorId}>
        {error}
      </p>
      <button className={`${primaryButtonClass} mt-3 w-full`} type="submit">
        Find Room
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
