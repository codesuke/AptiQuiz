"use client";

import { animate, motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useLayoutEffect, useRef } from "react";

/** Material 3 emphasized deceleration: fast in, gentle landing, for revealed results. */
export const EASE_EMPHASIZED = [0.05, 0.7, 0.1, 1] as const;
/** Material 3 standard easing, for phase entries and rank motion. */
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
const COUNT_UP_S = 0.7;
const STAGE_ENTER_S = 0.32;
const PULSE_S = 0.22;

/** A phase enters without delaying access to the newly opened Question or revealed result. */
export function LiveStage({ children }: { readonly children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="min-w-0"
      initial={reduceMotion ? false : { opacity: 1, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : STAGE_ENTER_S, ease: EASE_STANDARD }}
    >
      {children}
    </motion.div>
  );
}

/** A brief emphasis for a changed number or status; text is visible from the first frame. */
export function LivePulse({ children }: { readonly children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className="inline-block"
      initial={reduceMotion ? false : { scale: 1.08, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : PULSE_S, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}

const RANK_SLIDE_S = 0.55;
const RANK_SLIDE_DELAY_S = 0.18;
const RANK_STAGGER_S = 0.03;
const MAX_STAGGERED_RANKS = 10;

interface RankRowProps {
  /** Previous rank minus current rank, as sent by the server; null after the first Round. */
  readonly movement: number | null;
  readonly order: number;
  readonly current: boolean;
  readonly className: string;
  readonly children: ReactNode;
}

/**
 * A Leaderboard row that starts at its previous rank and slides into its server rank (FLIP).
 * Rows share one height, so a percentage offset lands exactly on the previous position.
 */
export function RankRow({ movement, order, current, className, children }: RankRowProps) {
  const reduceMotion = useReducedMotion();
  const offsetRows = movement ?? 0;
  const animates = !reduceMotion && offsetRows !== 0;
  return (
    <motion.tr
      aria-current={current ? "true" : undefined}
      className={`relative ${offsetRows > 0 ? "z-10" : ""} ${className}`}
      initial={animates ? { y: `${offsetRows * 100}%` } : false}
      animate={{ y: "0%" }}
      transition={{
        duration: animates ? RANK_SLIDE_S : 0,
        delay: animates
          ? RANK_SLIDE_DELAY_S + Math.min(order, MAX_STAGGERED_RANKS) * RANK_STAGGER_S
          : 0,
        ease: EASE_STANDARD,
      }}
    >
      {children}
    </motion.tr>
  );
}

interface CountUpProps {
  readonly value: number;
  readonly format: (value: number) => string;
  readonly className: string;
}

/**
 * Renders the final value first (server markup and reduced motion), then counts up to it
 * before the first paint, so there is no flash of the final value.
 */
export function CountUp({ value, format, className }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion) return;
    const controls = animate(0, value, {
      duration: COUNT_UP_S,
      ease: EASE_EMPHASIZED,
      onUpdate: (latest) => {
        node.textContent = format(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, format, reduceMotion]);
  return (
    <span className={className} ref={ref}>
      {format(value)}
    </span>
  );
}
