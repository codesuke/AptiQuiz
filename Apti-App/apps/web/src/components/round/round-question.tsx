"use client";

import type { RevealedRound, RoundView } from "@aptiquiz/contracts";
import type { ReactNode } from "react";
import type { ReceivedRound } from "@/lib/server-clock";
import { RoundScores } from "./round-scores";
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
      className="rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--aq-rule)] pb-5 text-sm text-[var(--aq-text-muted)]">
        <p className="font-[family-name:var(--aq-font-display)] text-2xl text-[var(--aq-ink)] sm:text-3xl">
          Question{" "}
          <span className="text-[var(--aq-action)]">
            {String(questionIndex + 1).padStart(2, "0")}
          </span>{" "}
          of {questionCount}
        </p>
        <p className="font-mono text-base font-semibold tabular-nums text-[var(--aq-action)] sm:text-xl">
          {status}
        </p>
      </div>
      <h2
        className="mt-6 text-balance font-[family-name:var(--aq-font-display)] text-2xl leading-snug text-[var(--aq-ink)] sm:text-3xl"
        id="round-question"
      >
        {question.text}
      </h2>
      {children}
    </section>
  );
}

interface RevealedQuestionProps {
  readonly view: RevealedRound;
  /** Shown between the options and the scores, e.g. the Participant's own result. */
  readonly children?: ReactNode;
}

/** A closed Round: options with the correct one and the receiver's pick marked, then scores. */
export function RevealedQuestion({ view, children }: RevealedQuestionProps) {
  return (
    <RoundFrame status="Round closed" view={view}>
      <ol className="mt-6 grid gap-2">
        {view.question.options.map((option) => {
          const labels = revealedOptionLabels(view, option.id);
          const correct = option.id === view.correctOptionId;
          return (
            <li
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 ${
                correct ? "border-emerald-600 bg-emerald-50" : "border-[var(--aq-rule)]"
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
      <RoundScores scores={view.scores} />
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
      <ol className="mt-6 grid gap-2">
        {round.view.question.options.map((option, index) => (
          <li
            className="flex min-h-14 items-center gap-4 rounded-lg border border-[var(--aq-rule)] px-4 py-3 text-[var(--aq-ink)]"
            key={option.id}
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--aq-rule)] font-mono text-xs"
            >
              {index + 1}
            </span>
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
