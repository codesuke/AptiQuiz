"use client";

import type { RevealedRound, RoundView } from "@aptiquiz/contracts";
import type { ReactNode } from "react";
import type { ReceivedRound } from "@/lib/server-clock";
import { Leaderboard } from "./leaderboard";
import { countdownLabel, revealedOptionLabels } from "./round-view";
import { useCountdown } from "./use-countdown";

interface RoundFrameProps {
  readonly view: RoundView;
  /** Countdown while open, "Round closed" after the reveal. */
  readonly status: string;
  readonly children: ReactNode;
}

/** The Question's header, text, and status line; the options go in `children`. */
export function RoundFrame({ view, status, children }: RoundFrameProps) {
  const { question, questionIndex, questionCount } = view;

  return (
    <section
      aria-labelledby="round-question"
      className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4 text-sm text-stone-600">
        <p>
          Question {questionIndex + 1} of {questionCount}
        </p>
        <p className="font-semibold tabular-nums text-stone-900">{status}</p>
      </div>
      <h2 className="mt-3 text-lg font-semibold" id="round-question">
        {question.text}
      </h2>
      {children}
    </section>
  );
}

interface RevealedQuestionProps {
  readonly view: RevealedRound;
  /** The viewing Participant's id, to highlight their row; omitted for the Host. */
  readonly viewerId?: string;
  /** Shown between the options and the Leaderboard, e.g. the Participant's own result. */
  readonly children?: ReactNode;
}

/** A closed Round: options with the correct one and the receiver's pick marked, then the Leaderboard. */
export function RevealedQuestion({ view, viewerId, children }: RevealedQuestionProps) {
  return (
    <RoundFrame status="Round closed" view={view}>
      <ol className="mt-4 grid gap-2">
        {view.question.options.map((option) => {
          const labels = revealedOptionLabels(view, option.id);
          const correct = option.id === view.correctOptionId;
          return (
            <li
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
                correct ? "border-emerald-600 bg-emerald-50" : "border-stone-200"
              }`}
              key={option.id}
            >
              <span>{option.text}</span>
              {labels.length > 0 ? (
                <span className="text-sm font-semibold text-stone-900">{labels.join(" · ")}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {children}
      <Leaderboard entries={view.leaderboard} viewerId={viewerId ?? null} />
    </RoundFrame>
  );
}

interface OpenHostQuestionProps {
  readonly round: ReceivedRound;
}

function OpenHostQuestion({ round }: OpenHostQuestionProps) {
  const secondsLeft = useCountdown(round);

  return (
    <RoundFrame status={countdownLabel(secondsLeft)} view={round.view}>
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

interface RoundQuestionProps {
  readonly round: ReceivedRound;
}

/** The Host's read-only view: options in the authored order, no answer controls. */
export function RoundQuestion({ round }: RoundQuestionProps) {
  const { view } = round;
  switch (view.phase) {
    case "QUESTION_OPEN":
      return <OpenHostQuestion round={round} />;
    case "QUESTION_REVEAL":
      return <RevealedQuestion view={view} />;
  }
}
