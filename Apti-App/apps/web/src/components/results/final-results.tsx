import type { FinalResult } from "@aptiquiz/contracts";
import {
  AVERAGE_TIME_LABEL,
  accuracyLabel,
  averageTimeLabel,
  FINISHING_LABEL,
  isOwnResult,
  topicLabel,
} from "./final-results-view";

interface FinalResultsProps {
  /** Saved results; undefined while the Room is finished but results are not committed. */
  readonly results: readonly FinalResult[] | undefined;
  /** The viewer's Participant id; null for the Host. */
  readonly viewerId: string | null;
}

export function FinalResults({ results, viewerId }: FinalResultsProps) {
  if (results === undefined) {
    return (
      <p
        className="rounded-xl border border-[var(--aq-rule)] bg-white px-4 py-3 font-semibold text-[#172823]"
        role="status"
      >
        {FINISHING_LABEL}
      </p>
    );
  }

  return (
    <section aria-labelledby="final-results-heading" className="min-w-0">
      <h2
        className="font-[family-name:var(--aq-font-display)] text-3xl tracking-[-0.04em]"
        id="final-results-heading"
      >
        Final results
      </h2>
      <ol className="mt-4 grid gap-3">
        {results.map((result) => {
          const own = isOwnResult(result, viewerId);
          return (
            <li
              aria-current={own ? "true" : undefined}
              className={`rounded-xl border bg-white p-4 ${own ? "border-2 border-[var(--aq-ink)]" : "border-[var(--aq-rule)]"}`}
              key={result.participantId}
            >
              <p className="flex flex-wrap items-baseline gap-x-3 font-semibold">
                <span className="font-mono">Rank {result.rank}</span>
                <span className="min-w-0 break-words">
                  {result.displayName}
                  {own ? " (you)" : ""}
                </span>
              </p>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[var(--aq-text-muted)]">Total score</dt>
                  <dd className="font-mono">{result.totalScore}</dd>
                </div>
                <div>
                  <dt className="text-[var(--aq-text-muted)]">Accuracy</dt>
                  <dd className="font-mono">
                    {accuracyLabel(result.correctAnswers, result.totalQuestions)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--aq-text-muted)]">{AVERAGE_TIME_LABEL}</dt>
                  <dd className="font-mono">{averageTimeLabel(result.averageResponseMs)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-[var(--aq-text-muted)]">Topic strengths</p>
              <ul className="text-sm">
                {result.topics.map((topic) => (
                  <li key={topic.topic}>{topicLabel(topic)}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
