"use client";

import type { RevealedRound, RoundView } from "@aptiquiz/contracts";
import type { ReactNode } from "react";
import type { ReceivedRound } from "@/lib/server-clock";
import { Leaderboard } from "./leaderboard";
import { LivePulse } from "./live-motion";
import { personalResult } from "./personal-result";
import { PersonalResultCard } from "./personal-result-card";
import { RevealHighlights } from "./reveal-highlights";
import { revealOutcome } from "./reveal-outcome";
import { countdownLabel, revealedOptionLabels } from "./round-view";
import { useCountdown, useDeadlineCountdown } from "./use-countdown";

interface RoundFrameProps {
  readonly view: RoundView;
  /** Countdown while open, "Round closed" after the reveal. */
  readonly status: string;
  readonly hostSecondsLeft?: number;
  readonly pulse?: boolean;
  readonly children: ReactNode;
}

/** The Question's header, text, and status line; the options go in `children`. */
export function RoundFrame({
  view,
  status,
  hostSecondsLeft,
  pulse = false,
  children,
}: RoundFrameProps) {
  const { question, questionIndex, questionCount } = view;

  return (
    <section
      aria-labelledby="round-question"
      className="rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--aq-rule)] pb-5 text-sm text-[var(--aq-text-muted)]">
        <p className="font-[family-name:var(--aq-font-display)] text-2xl text-[var(--aq-ink)] sm:text-3xl">
          Question{" "}
          <span className="text-[var(--aq-action)]">
            {String(questionIndex + 1).padStart(2, "0")}
          </span>{" "}
          of {questionCount}
        </p>
        {hostSecondsLeft === undefined ? (
          <p className="font-mono text-base font-semibold tabular-nums text-[var(--aq-action)] sm:text-xl">
            {pulse ? <LivePulse key={status}>{status}</LivePulse> : status}
          </p>
        ) : (
          <div className="text-right">
            <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--aq-text-muted)]">
              Live round
            </p>
            <div
              aria-label={status}
              className="font-mono text-[clamp(3.2rem,5vw,5rem)] font-bold leading-none tabular-nums text-[var(--aq-action)]"
              role="timer"
            >
              {pulse ? (
                <LivePulse key={hostSecondsLeft}>
                  00:{String(hostSecondsLeft).padStart(2, "0")}
                </LivePulse>
              ) : (
                `00:${String(hostSecondsLeft).padStart(2, "0")}`
              )}
            </div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[var(--aq-text-muted)]">
              Time remaining
            </p>
          </div>
        )}
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

interface RevealedFrameProps {
  readonly view: RevealedRound;
  readonly clockOffsetMs: number;
  /** Shown between the Question text and the marked options. */
  readonly lead?: ReactNode;
  /** Shown after the marked options. */
  readonly children?: ReactNode;
}

/** A closed Round's Question with the correct option and the receiver's pick marked. */
function RevealedFrame({ view, clockOffsetMs, lead, children }: RevealedFrameProps) {
  const secondsLeft = useDeadlineCountdown(view.revealEndsAt, clockOffsetMs);
  const nextLabel = view.questionIndex + 1 === view.questionCount ? "Results" : "Next Question";
  return (
    <RoundFrame
      status={`${nextLabel} in ${secondsLeft}s`}
      pulse={secondsLeft > 0 && secondsLeft <= 3}
      view={view}
    >
      {lead}
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
    </RoundFrame>
  );
}

interface RevealedQuestionProps {
  readonly view: RevealedRound;
  readonly clockOffsetMs: number;
  /** The viewing Participant's id, for their result and Leaderboard row. */
  readonly viewerId: string;
}

/**
 * A Participant's closed Round, personal first: their result and rank, the marked options,
 * the shared Round highlights, then the cumulative Leaderboard with this Round's points.
 */
export function RevealedQuestion({ view, clockOffsetMs, viewerId }: RevealedQuestionProps) {
  const outcome = revealOutcome(view.scores);
  const personal = personalResult(view, viewerId);
  return (
    <RevealedFrame
      clockOffsetMs={clockOffsetMs}
      lead={
        personal ? (
          <PersonalResultCard
            fastest={outcome.fastestCorrect?.participantId === viewerId}
            result={personal}
          />
        ) : null
      }
      view={view}
    >
      <section aria-label="Round highlights" className="mt-6">
        <RevealHighlights outcome={outcome} />
      </section>
      <Leaderboard
        entries={view.leaderboard}
        roundPoints={outcome.pointsByParticipant}
        viewerId={viewerId}
      />
    </RevealedFrame>
  );
}

interface OpenHostQuestionProps {
  readonly round: ReceivedRound;
}

function OpenHostQuestion({ round }: OpenHostQuestionProps) {
  const secondsLeft = useCountdown(round);

  return (
    <RoundFrame
      hostSecondsLeft={secondsLeft}
      pulse={secondsLeft > 0 && secondsLeft <= 3}
      status={countdownLabel(secondsLeft)}
      view={round.view}
    >
      <ol className="mt-7 grid gap-5">
        {round.view.question.options.map((option, index) => (
          <li
            className="flex min-h-14 items-center gap-4 text-lg text-[var(--aq-ink)]"
            key={option.id}
          >
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--aq-rule)] font-mono text-sm"
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

/**
 * The Host's read-only Question: options in the authored order, no answer controls. The Host
 * view shows the revealed Leaderboard in its own section below this card.
 */
export function RoundQuestion({ round }: RoundQuestionProps) {
  const { view } = round;
  switch (view.phase) {
    case "QUESTION_OPEN":
      return <OpenHostQuestion round={round} />;
    case "QUESTION_REVEAL":
      return <RevealedFrame clockOffsetMs={round.clockOffsetMs} view={view} />;
  }
}
