"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Timer, X } from "lucide-react";
import { movementView } from "./leaderboard-view";
import { CountUp, EASE_EMPHASIZED } from "./live-motion";
import type { PersonalOutcome, PersonalResult, PersonalStanding } from "./personal-result";
import { roundPointsLabel } from "./reveal-outcome";

const CARD_RISE_S = 0.45;
const RANK_DELAY_S = 0.2;
const MOVEMENT_DELAY_S = 0.38;
const RANK_TRAVEL_PX = 18;
const WRONG_SHAKE_PX = [0, -5, 5, -3, 3, 0];

const OUTCOME_STYLES: Record<PersonalOutcome, { badge: string; card: string }> = {
  correct: {
    badge: "bg-emerald-700 text-white shadow-[0_6px_18px_rgba(4,120,87,0.35)]",
    card: "border-emerald-700/30 bg-[#eef5ef]",
  },
  wrong: {
    badge: "bg-red-800 text-white shadow-[0_6px_18px_rgba(153,27,27,0.25)]",
    card: "border-[var(--aq-rule)] bg-[var(--aq-hero-surface)]",
  },
  no_answer: {
    badge: "bg-[var(--aq-surface)] text-[var(--aq-text-muted)] ring-1 ring-[var(--aq-rule)]",
    card: "border-[var(--aq-rule)] bg-[var(--aq-hero-surface)]",
  },
};

const OUTCOME_ICONS: Record<PersonalOutcome, typeof Check> = {
  correct: Check,
  wrong: X,
  no_answer: Minus,
};

interface PersonalResultCardProps {
  readonly result: PersonalResult;
  /** True when the server's times make this Participant the fastest correct Answer. */
  readonly fastest: boolean;
}

/**
 * The Participant's own Round outcome, points, and standing. Every value is readable from
 * the first frame; motion only adds emphasis and is skipped for reduced-motion preferences.
 */
export function PersonalResultCard({ result, fastest }: PersonalResultCardProps) {
  const reduceMotion = useReducedMotion();
  const styles = OUTCOME_STYLES[result.outcome];
  return (
    <motion.section
      aria-label="Your Round result"
      className={`relative mt-6 overflow-hidden rounded-xl border p-5 sm:p-6 ${styles.card}`}
      initial={reduceMotion ? false : { opacity: 1, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : CARD_RISE_S, ease: EASE_EMPHASIZED }}
    >
      {result.outcome === "correct" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(4,120,87,0.16),transparent_70%)]"
        />
      ) : null}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-4">
        <div className="min-w-0">
          <p className="flex items-center gap-3" role="status">
            <OutcomeBadge outcome={result.outcome} />
            <span className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)] sm:text-3xl">
              {result.headline}
            </span>
            <span className="sr-only">{`, ${roundPointsLabel(result.points)} points.`}</span>
          </p>
          <p aria-hidden="true" className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <CountUp
              className="font-[family-name:var(--aq-font-display)] text-[clamp(2.4rem,6vw,3.4rem)] leading-none tracking-[-0.04em] tabular-nums text-[var(--aq-action)]"
              format={roundPointsLabel}
              value={result.points}
            />
            <span className="text-sm text-[var(--aq-text-muted)]">points this Round</span>
          </p>
          {fastest ? <FastestBadge /> : null}
        </div>
        {result.standing ? <StandingCallout standing={result.standing} /> : null}
      </div>
    </motion.section>
  );
}

function OutcomeBadge({ outcome }: { readonly outcome: PersonalOutcome }) {
  const reduceMotion = useReducedMotion();
  const Icon = OUTCOME_ICONS[outcome];
  const className = `grid size-10 shrink-0 place-items-center rounded-full ${OUTCOME_STYLES[outcome].badge}`;
  if (reduceMotion || outcome === "no_answer") {
    return (
      <span aria-hidden="true" className={className}>
        <Icon className="size-5" strokeWidth={2.6} />
      </span>
    );
  }
  // A correct Answer pops in with a little overshoot; a wrong one settles with a short shake.
  const motionProps =
    outcome === "correct"
      ? {
          initial: { scale: 0.4, rotate: -25 },
          animate: { scale: 1, rotate: 0 },
          transition: { type: "spring" as const, stiffness: 460, damping: 14, delay: 0.1 },
        }
      : {
          initial: { x: 0 },
          animate: { x: WRONG_SHAKE_PX },
          transition: { duration: 0.36, ease: "easeInOut" as const, delay: 0.1 },
        };
  return (
    <motion.span aria-hidden="true" className={className} {...motionProps}>
      <Icon className="size-5" strokeWidth={2.6} />
    </motion.span>
  );
}

function FastestBadge() {
  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--aq-ink-deep)] px-3 py-1 text-xs font-semibold text-white">
      <Timer aria-hidden="true" className="size-3.5 text-[#ff9a52]" strokeWidth={2.4} />
      Quickest correct answer this Round
    </p>
  );
}

function StandingCallout({ standing }: { readonly standing: PersonalStanding }) {
  const reduceMotion = useReducedMotion();
  const direction = Math.sign(standing.movement ?? 0);
  return (
    <div className="flex flex-col items-end text-right">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[var(--aq-text-muted)]">
        Your rank
      </p>
      <p className="mt-1 flex items-baseline gap-1.5 text-[var(--aq-ink)]">
        <motion.span
          className="inline-block font-[family-name:var(--aq-font-display)] text-[clamp(3rem,8vw,4.5rem)] leading-none tracking-[-0.05em] tabular-nums"
          // The rank rises into place when the Participant climbed and drops in when they fell.
          initial={
            reduceMotion || direction === 0 ? false : { y: direction * RANK_TRAVEL_PX, scale: 0.9 }
          }
          animate={{ y: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 20, delay: RANK_DELAY_S }
          }
        >
          #{standing.rank}
        </motion.span>
        <span className="font-mono text-sm text-[var(--aq-text-muted)]">
          of {standing.participantCount}
        </span>
      </p>
      <MovementChip direction={direction} label={movementView(standing.movement).ariaLabel} />
    </div>
  );
}

function movementTone(direction: number) {
  if (direction > 0) return { arrow: "▲", chip: "bg-emerald-700 text-white" };
  if (direction < 0) return { arrow: "▼", chip: "bg-red-50 text-red-800 ring-1 ring-red-200" };
  return {
    arrow: null,
    chip: "bg-[var(--aq-surface)] text-[var(--aq-ink)] ring-1 ring-[var(--aq-rule)]",
  };
}

interface MovementChipProps {
  readonly label: string;
  readonly direction: number;
}

/** The rank change in words and an arrow; a climb gets a one-time ring burst. */
function MovementChip({ label, direction }: MovementChipProps) {
  const reduceMotion = useReducedMotion();
  const climbed = direction > 0;
  const { arrow, chip } = movementTone(direction);
  return (
    <motion.p
      className={`relative mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${chip}`}
      initial={reduceMotion ? false : { scale: 0.85 }}
      animate={{ scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 16, delay: MOVEMENT_DELAY_S }
      }
    >
      {climbed && !reduceMotion ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-600"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: MOVEMENT_DELAY_S + 0.1 }}
        />
      ) : null}
      {arrow ? <span aria-hidden="true">{arrow}</span> : null}
      {label}
    </motion.p>
  );
}
