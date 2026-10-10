"use client";

import type { ReceivedRound } from "@/lib/server-clock";
import { useCountdown } from "./use-countdown";

interface RoundQuestionProps {
  readonly round: ReceivedRound;
}

/** The open Question, its options in the receiver's order, and the server-timed countdown. */
export function RoundQuestion({ round }: RoundQuestionProps) {
  const secondsLeft = useCountdown(round);
  const { question, questionIndex, questionCount } = round.view;

  return (
    <section
      aria-labelledby="round-question"
      className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4 text-sm text-stone-600">
        <p>
          Question {questionIndex + 1} of {questionCount}
        </p>
        <p className="font-semibold tabular-nums text-stone-900">
          {secondsLeft === 0 ? "Time's up" : `${secondsLeft}s left`}
        </p>
      </div>
      <h2 className="mt-3 text-lg font-semibold" id="round-question">
        {question.text}
      </h2>
      <ol className="mt-4 grid gap-2">
        {question.options.map((option) => (
          <li className="rounded-lg border border-stone-200 px-4 py-3" key={option.id}>
            {option.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
