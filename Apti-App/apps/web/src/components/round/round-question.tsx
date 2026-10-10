"use client";

import type { ReactNode } from "react";
import type { ReceivedRound } from "@/lib/server-clock";
import { useCountdown } from "./use-countdown";

interface RoundFrameProps {
  readonly round: ReceivedRound;
  readonly secondsLeft: number;
  readonly children: ReactNode;
}

/** The open Question's header, text, and server-timed countdown; the options go in `children`. */
export function RoundFrame({ round, secondsLeft, children }: RoundFrameProps) {
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
      {children}
    </section>
  );
}

interface RoundQuestionProps {
  readonly round: ReceivedRound;
}

/** The Host's read-only view: options in the authored order, no answer controls. */
export function RoundQuestion({ round }: RoundQuestionProps) {
  const secondsLeft = useCountdown(round);

  return (
    <RoundFrame round={round} secondsLeft={secondsLeft}>
      <ol className="mt-4 grid gap-2">
        {round.view.question.options.map((option) => (
          <li className="rounded-lg border border-stone-200 px-4 py-3" key={option.id}>
            {option.text}
          </li>
        ))}
      </ol>
    </RoundFrame>
  );
}
