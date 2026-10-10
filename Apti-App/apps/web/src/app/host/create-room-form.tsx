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
        <ul className="mt-4 space-y-2">
          {questionSets.map((set) => {
            const empty = set.questionCount === 0;
            return (
              <li key={set.id}>
                <label
                  className={`flex min-h-[4.25rem] cursor-pointer items-center gap-4 rounded-xl border bg-white/[0.07] px-5 py-3 transition-[background-color,border-color,transform] duration-300 has-[:checked]:border-[#ffb380] has-[:checked]:bg-white/[0.12] has-[:checked]:ring-2 has-[:checked]:ring-[#ffb380]/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#ffb380] ${empty ? "cursor-not-allowed border-white/10 opacity-50" : "border-white/15 hover:-translate-y-0.5 hover:border-[#ffb380]/70"}`}
                >
                  <input
                    checked={questionSetId === set.id}
                    className="size-5 accent-[#e65c00]"
                    disabled={empty || pending}
                    name="questionSetId"
                    onChange={() => chooseQuestionSet(set.id)}
                    type="radio"
                    value={set.id}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{set.title}</span>
                    <span className="mt-0.5 block text-sm text-[#d0ddd5]">
                      {set.questionCount} {set.questionCount === 1 ? "Question" : "Questions"}
                      {set.isStarter ? " · Starter set" : ""}
                      {empty ? " · Add a Question to host it" : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
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
