"use client";

import type { FinalResult } from "@aptiquiz/contracts";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { EASE_STANDARD } from "@/components/round/live-motion";
import {
  AVERAGE_TIME_LABEL,
  accuracyLabel,
  averageTimeLabel,
  isOwnResult,
  topicLabel,
} from "./final-results-view";

interface FinalResultsProps {
  readonly results: readonly FinalResult[] | undefined;
  readonly viewerId: string | null;
}

export function FinalResults({ results, viewerId }: FinalResultsProps) {
  const reduceMotion = useReducedMotion();
  if (results === undefined) {
    return (
      <section
        aria-live="polite"
        className="grid min-h-[24rem] place-content-center rounded-2xl border border-[var(--aq-rule)] bg-white p-8 text-center"
        role="status"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-7 size-12 animate-spin rounded-full border-4 border-[var(--aq-rule)] border-t-[var(--aq-action)] motion-reduce:animate-none"
        />
        <h2 className="font-[family-name:var(--aq-font-display)] text-3xl tracking-[-0.04em]">
          Finalizing results
        </h2>
        <p className="mt-3 max-w-md text-[var(--aq-text-muted)]">
          We’re saving the final scores. Your results will appear here automatically.
        </p>
      </section>
    );
  }

  const own = results.find((result) => isOwnResult(result, viewerId));
  const podium = results.slice(0, 3);

  return (
    <section aria-labelledby="final-results-heading" className="min-w-0 space-y-8">
      <header className="rounded-2xl bg-[var(--aq-ink)] px-6 py-8 text-white sm:px-9 sm:py-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#b6d8ca]">
          Match complete
        </p>
        <h2
          id="final-results-heading"
          className="mt-3 font-[family-name:var(--aq-font-display)] text-[clamp(2.6rem,5vw,4.5rem)] leading-none tracking-[-0.06em]"
        >
          Final results
        </h2>
        <p className="mt-4 text-[#d0ddd5]">
          Every Question is counted. Here’s how the Room finished.
        </p>
      </header>

      {own ? (
        <section
          aria-labelledby="own-result-heading"
          className="rounded-2xl border-2 border-[var(--aq-action)] bg-white p-5 sm:p-7"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--aq-action)]">
            Your result
          </p>
          <h3
            id="own-result-heading"
            className="mt-2 font-[family-name:var(--aq-font-display)] text-3xl"
          >
            {own.displayName}
          </h3>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--aq-surface)] px-4 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[var(--aq-text-muted)]">
                Your rank
              </dt>
              <dd className="mt-1 font-[family-name:var(--aq-font-display)] text-3xl tabular-nums">
                {own.rank}
              </dd>
            </div>
            <div className="rounded-xl bg-[var(--aq-ink)] px-4 py-3 text-white">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#b6d8ca]">
                Your score
              </dt>
              <dd className="mt-1 font-[family-name:var(--aq-font-display)] text-3xl tabular-nums">
                {own.totalScore} points
              </dd>
            </div>
          </dl>
          <ResultMetrics result={own} />
        </section>
      ) : null}

      {podium.length > 0 ? (
        <section aria-labelledby="podium-heading">
          <h3
            id="podium-heading"
            className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em]"
          >
            Top three
          </h3>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {podium.map((result) => (
              <motion.li
                key={result.participantId}
                initial={reduceMotion ? false : { opacity: 1, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : result.rank * 0.06,
                  ease: EASE_STANDARD,
                }}
                className={`min-w-0 rounded-2xl border p-5 transition-transform duration-300 motion-safe:hover:-translate-y-1 ${podiumPresentation(result.rank).className}`}
              >
                <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[var(--aq-action)]">
                  {podiumPresentation(result.rank).label}
                </p>
                <p className="mt-3 break-words font-[family-name:var(--aq-font-display)] text-2xl">
                  {result.displayName}
                  {isOwnResult(result, viewerId) ? " (you)" : ""}
                </p>
                <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
                  {result.totalScore}
                  <span className="ml-2 text-xs font-normal text-[var(--aq-text-muted)]">
                    points
                  </span>
                </p>
              </motion.li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="standings-heading">
        <h3
          id="standings-heading"
          className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em]"
        >
          Full leaderboard
        </h3>
        {results.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--aq-rule)] bg-white p-5">
            No Participants joined this Room.
          </p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {results.map((result) => (
              <li
                key={result.participantId}
                aria-current={isOwnResult(result, viewerId) ? "true" : undefined}
                className={`min-w-0 rounded-xl border bg-white p-4 sm:p-5 ${isOwnResult(result, viewerId) ? "border-2 border-[var(--aq-action)] bg-[var(--aq-hero-surface)]" : "border-[var(--aq-rule)]"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 break-words font-semibold">
                    <span className="mr-3 font-mono text-[var(--aq-action)]">
                      Rank {result.rank}
                    </span>
                    {result.displayName}
                    {isOwnResult(result, viewerId) ? " (you)" : ""}
                  </p>
                  <p className="font-mono font-bold tabular-nums">{result.totalScore} points</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {own ? (
        <nav
          aria-label="Continue after results"
          className="flex flex-col items-start gap-4 border-t border-[var(--aq-rule)] pt-7 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--aq-action-prominent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--aq-action-prominent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)]"
            href="/league"
          >
            View College League
          </Link>
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-[var(--aq-ink)] underline decoration-[var(--aq-action)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--aq-action)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aq-action)]"
            href="/"
          >
            Back to AptiQuiz home
          </Link>
        </nav>
      ) : null}
    </section>
  );
}

const PODIUM_PRESENTATIONS = new Map([
  [
    1,
    {
      label: "First place",
      className: "border-[var(--aq-action)] bg-[var(--aq-hero-surface)] sm:-translate-y-3",
    },
  ],
  [2, { label: "Second place", className: "border-[var(--aq-rule)] bg-[var(--aq-surface)]" }],
  [3, { label: "Third place", className: "border-[var(--aq-rule)] bg-white" }],
]);

function podiumPresentation(rank: number) {
  return (
    PODIUM_PRESENTATIONS.get(rank) ?? {
      label: `Place ${rank}`,
      className: "border-[var(--aq-rule)] bg-white",
    }
  );
}

function ResultMetrics({ result }: { readonly result: FinalResult }) {
  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <dt className="text-[var(--aq-text-muted)]">Accuracy</dt>
        <dd className="font-mono font-semibold">
          {accuracyLabel(result.correctAnswers, result.totalQuestions)}
        </dd>
      </div>
      <div>
        <dt className="text-[var(--aq-text-muted)]">{AVERAGE_TIME_LABEL}</dt>
        <dd className="font-mono font-semibold">{averageTimeLabel(result.averageResponseMs)}</dd>
      </div>
      <div>
        <dt className="text-[var(--aq-text-muted)]">Topic strengths</dt>
        <dd>
          {result.topics.map((topic) => (
            <span className="mr-3 block sm:inline" key={topic.topic}>
              {topicLabel(topic)}
            </span>
          ))}
        </dd>
      </div>
    </dl>
  );
}
