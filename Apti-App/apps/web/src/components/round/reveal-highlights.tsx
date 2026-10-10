"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Timer } from "lucide-react";
import type { ReactNode } from "react";
import { participantsLabel } from "@/components/lobby/lobby-copy";
import { CountUp, EASE_EMPHASIZED } from "./live-motion";
import { type FastestCorrect, formatResponseTime, type RevealOutcome } from "./reveal-outcome";

export const NO_CORRECT_ANSWERS_MESSAGE = "No correct answers this Round";

const TILE_STAGGER_S = 0.09;
const BAR_FILL_S = 0.7;
const BADGE_DELAY_S = 0.22;
const TILE_RISE_S = 0.45;
const BAR_FILL_DELAY_S = 0.15;
// A quick, slightly bouncy pop so the timer badge lands after the tile.
const BADGE_SPRING = { type: "spring", stiffness: 420, damping: 14 } as const;

/** The Round outcome at a glance: who was correct fastest, and how many were correct. */
export function RevealHighlights({ outcome }: { readonly outcome: RevealOutcome }) {
  const lead = leadTile(outcome);
  return (
    <div
      className={`grid gap-3 sm:gap-4 ${lead ? "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : ""}`}
    >
      {lead ? <HighlightTile order={0}>{lead}</HighlightTile> : null}
      <HighlightTile order={lead ? 1 : 0}>
        <CorrectCountTile
          correctCount={outcome.correctCount}
          participantCount={outcome.participantCount}
        />
      </HighlightTile>
    </div>
  );
}

/**
 * The no-winner message follows the correct count alone; a correct Answer without a server
 * time leaves no lead tile rather than claiming nobody was correct.
 */
function leadTile(outcome: RevealOutcome): ReactNode {
  if (outcome.correctCount === 0) return <NoWinnerTile />;
  if (outcome.fastestCorrect) return <FastestCorrectTile fastest={outcome.fastestCorrect} />;
  return null;
}

/** Tiles rise in one after another; their content is readable from the first frame. */
function HighlightTile({
  order,
  children,
}: {
  readonly order: number;
  readonly children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="min-w-0"
      initial={reduceMotion ? false : { opacity: 1, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : TILE_RISE_S,
        delay: reduceMotion ? 0 : order * TILE_STAGGER_S,
        ease: EASE_EMPHASIZED,
      }}
    >
      {children}
    </motion.div>
  );
}

function FastestCorrectTile({ fastest }: { readonly fastest: FastestCorrect }) {
  const reduceMotion = useReducedMotion();
  return (
    <section
      aria-label="Fastest correct answer"
      className="relative h-full overflow-hidden rounded-xl bg-[var(--aq-ink-deep)] p-5 text-white sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--aq-brand-orange)_35%,transparent),transparent_70%)] motion-safe:animate-pulse"
      />
      <div className="relative flex items-start justify-between gap-4">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--aq-text-on-dark)]">
          Fastest correct
        </p>
        <motion.span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--aq-brand-orange)] text-white shadow-[0_6px_18px_color-mix(in_srgb,var(--aq-brand-orange)_45%,transparent)]"
          initial={reduceMotion ? false : { scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...BADGE_SPRING, delay: BADGE_DELAY_S }}
        >
          <Timer className="size-4.5" strokeWidth={2.4} />
        </motion.span>
      </div>
      <p className="relative mt-3 truncate font-[family-name:var(--aq-font-display)] text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight tracking-[-0.03em]">
        {fastest.displayName}
      </p>
      <p className="relative mt-1 flex items-baseline gap-2 text-[var(--aq-text-on-dark)]">
        <span className="sr-only">Effective Response Time </span>
        <CountUp
          className="font-mono text-3xl font-semibold tabular-nums text-[var(--aq-brand-orange-on-dark)]"
          format={formatResponseTime}
          value={fastest.effectiveResponseMs}
        />
        <span className="text-sm">server-timed</span>
      </p>
    </section>
  );
}

function NoWinnerTile() {
  return (
    <section
      aria-label="Round outcome"
      className="flex h-full items-center rounded-xl border border-dashed border-[var(--aq-rule)] bg-[var(--aq-surface)] p-5 sm:p-6"
    >
      <p className="font-[family-name:var(--aq-font-display)] text-xl tracking-[-0.02em] text-[var(--aq-ink)] sm:text-2xl">
        {NO_CORRECT_ANSWERS_MESSAGE}
      </p>
    </section>
  );
}

function CorrectCountTile({
  correctCount,
  participantCount,
}: {
  readonly correctCount: number;
  readonly participantCount: number;
}) {
  const reduceMotion = useReducedMotion();
  const share = participantCount === 0 ? 0 : correctCount / participantCount;
  return (
    <section
      aria-label="Correct answers"
      className="flex h-full flex-col justify-between rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-6"
    >
      <p aria-hidden="true" className="flex items-baseline gap-1.5 text-[var(--aq-ink)]">
        <CountUp
          className="font-[family-name:var(--aq-font-display)] text-5xl leading-none tracking-[-0.04em] tabular-nums"
          format={String}
          value={correctCount}
        />
        <span className="font-mono text-lg text-[var(--aq-text-muted)]">/ {participantCount}</span>
      </p>
      <div className="mt-4">
        <div
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-full bg-[var(--aq-surface)]"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--aq-action)]"
            initial={reduceMotion ? false : { scaleX: 0 }}
            animate={{ scaleX: share }}
            transition={{
              duration: reduceMotion ? 0 : BAR_FILL_S,
              delay: BAR_FILL_DELAY_S,
              ease: EASE_EMPHASIZED,
            }}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--aq-text-muted)]">
          {`${correctCount} of ${participantsLabel(participantCount)} answered correctly`}
        </p>
      </div>
    </section>
  );
}
