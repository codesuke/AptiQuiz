"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { describeCreateRoomFailure, requestRoomCreation } from "@/lib/rooms-client";
import { initialQuestionSetId } from "./initial-question-set";

export interface HostableQuestionSet {
  id: string;
  title: string;
  questionCount: number;
  isStarter: boolean;
}

export function CreateRoomForm({
  questionSets,
  requestedQuestionSetId,
}: {
  questionSets: HostableQuestionSet[];
  requestedQuestionSetId?: string;
}) {
  const router = useRouter();
  const [questionSetId, setQuestionSetId] = useState(() =>
    initialQuestionSetId(questionSets, requestedQuestionSetId),
  );
  // One key per creation attempt: a retry after an error reuses it so the server returns the
  // same Room instead of creating a second one. Choosing another set starts a new attempt.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedQuestionSet = questionSets.find((set) => set.id === questionSetId);

  function chooseQuestionSet(id: string) {
    setQuestionSetId(id);
    setIdempotencyKey(crypto.randomUUID());
    setError(null);
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionSetId || pending) return;
    setPending(true);
    setError(null);
    const outcome = await requestRoomCreation({ questionSetId, idempotencyKey });
    if (outcome.ok) {
      router.push(`/host/rooms/${encodeURIComponent(outcome.room.roomId)}`);
      return;
    }
    setError(describeCreateRoomFailure(outcome.error));
    setPending(false);
  }

  return (
    <form className="mt-5 border-t border-white/20 pt-5" onSubmit={createRoom}>
      <fieldset>
        <legend className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#d0ddd5]">
          Choose a Question Set
        </legend>
        <label className="sr-only" htmlFor="question-set">
          Choose a Question Set
        </label>
        <select
          className="mt-4 min-h-14 w-full cursor-pointer appearance-none rounded-xl border border-white/20 bg-white/[0.1] bg-[linear-gradient(45deg,transparent_50%,#ffb380_50%),linear-gradient(135deg,#ffb380_50%,transparent_50%)] bg-[position:calc(100%-1.45rem)_50%,calc(100%-1rem)_50%] bg-[size:0.45rem_0.45rem,0.45rem_0.45rem] bg-no-repeat px-5 pr-12 text-base font-medium text-white outline-none transition-[background-color,border-color,transform] duration-300 hover:border-[#ffb380]/70 focus-visible:border-[#ffb380] focus-visible:ring-2 focus-visible:ring-[#ffb380]/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          id="question-set"
          onChange={(event) => chooseQuestionSet(event.target.value)}
          value={questionSetId}
        >
          <option disabled value="">
            Select a Question Set
          </option>
          {questionSets.map((set) => (
            <option disabled={set.questionCount === 0} key={set.id} value={set.id}>
              {set.title}
              {set.isStarter ? " — Starter set" : ""}
              {set.questionCount === 0 ? " — Add a Question first" : ""}
            </option>
          ))}
        </select>
        {selectedQuestionSet ? (
          <p className="mt-3 rounded-lg border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-[#d0ddd5]">
            <span className="font-semibold text-white">{selectedQuestionSet.questionCount}</span>{" "}
            {selectedQuestionSet.questionCount === 1 ? "Question" : "Questions"}
            {selectedQuestionSet.isStarter ? " · Starter set" : ""}
          </p>
        ) : null}
      </fieldset>
      <div aria-live="assertive" className="mt-4 min-h-6">
        {error ? (
          <p
            className="rounded-lg border border-red-300/30 bg-red-950/30 p-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
      <button
        className="mt-2 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#ec6b12] px-6 font-semibold text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.75)] transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-[#b84700] hover:shadow-[0_18px_32px_-16px_rgba(0,0,0,0.78)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb380] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={!questionSetId || pending}
        type="submit"
      >
        {pending ? "Creating Room…" : error ? "Try again" : "Create Room"}
      </button>
    </form>
  );
}
