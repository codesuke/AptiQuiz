"use client";

import type { LobbyParticipant } from "@aptiquiz/contracts";
import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";
import { type ReactNode, useId } from "react";
import { EASE_STANDARD } from "@/components/round/live-motion";
import { participantCountLabel } from "./lobby-copy";
import { ParticipantIdentity } from "./lobby-details";

// The roster shows about this many compact rows before it scrolls.
const ROSTER_VISIBLE_ROWS = 7;
// Matches the rows' min-h-11; the extra space covers the dividers.
const ROSTER_ROW_HEIGHT_REM = 2.75;
const ROSTER_DIVIDER_ALLOWANCE_REM = 0.5;
const ROSTER_MAX_HEIGHT = `${ROSTER_VISIBLE_ROWS * ROSTER_ROW_HEIGHT_REM + ROSTER_DIVIDER_ALLOWANCE_REM}rem`;
const PANEL_RISE_S = 0.4;
const ROW_SLIDE_S = 0.24;
const PANEL_STAGGER_S = 0.08;
const ROW_STAGGER_S = 0.025;
const MAX_STAGGERED_ROWS = 10;

/** The row of Room panels below the quiz area; it stacks in reading order on small screens. */
export function UtilityRow({ children }: { readonly children: ReactNode }) {
  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-7">
      {children}
    </div>
  );
}

/** Panels rise in one after another; content is visible from the first frame. */
export function UtilityPanel({
  order,
  children,
}: {
  readonly order: number;
  readonly children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="h-full min-w-0"
      initial={reduceMotion ? false : { opacity: 1, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : PANEL_RISE_S,
        delay: reduceMotion ? 0 : order * PANEL_STAGGER_S,
        ease: EASE_STANDARD,
      }}
    >
      {children}
    </motion.div>
  );
}

interface ActiveRosterProps {
  readonly participants: readonly LobbyParticipant[];
  readonly emptyMessage: string;
}

/** The Participant count and a compact roster that scrolls after about seven rows. */
export function ActiveRoster({ participants, emptyMessage }: ActiveRosterProps) {
  const headingId = useId();
  const scrolls = participants.length > ROSTER_VISIBLE_ROWS;
  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full flex-col rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-2 font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)]"
          id={headingId}
        >
          <Users aria-hidden="true" className="size-5 text-[var(--aq-text-muted)]" />
          Players
        </h2>
        <p
          aria-atomic="true"
          aria-live="polite"
          className="font-mono text-sm font-semibold text-[var(--aq-text-muted)]"
        >
          <span className="sr-only">Players in the Room: </span>
          {participantCountLabel(participants.length)}
        </p>
      </div>
      {participants.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[var(--aq-rule)] px-4 py-5 text-center text-sm text-[var(--aq-text-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <>
          <section
            aria-label="Participant roster"
            className="mt-3 overflow-y-auto overscroll-contain rounded-lg [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)]"
            style={{ maxHeight: ROSTER_MAX_HEIGHT }}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to focus a scrollable region to scroll it.
            tabIndex={0}
          >
            <RosterList participants={participants} />
          </section>
          {scrolls ? (
            <p className="mt-3 text-xs text-[var(--aq-text-muted)]">
              {`Scroll to see all ${participants.length} players.`}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function RosterList({ participants }: { readonly participants: readonly LobbyParticipant[] }) {
  const reduceMotion = useReducedMotion();
  return (
    <ul className="divide-y divide-[var(--aq-rule)] pr-1">
      {participants.map((participant, index) => (
        <motion.li
          className="flex min-h-11 min-w-0 items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-[var(--aq-surface)]"
          key={participant.participantId}
          initial={reduceMotion ? false : { opacity: 1, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: reduceMotion ? 0 : ROW_SLIDE_S,
            delay: reduceMotion ? 0 : Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_S,
            ease: "easeOut",
          }}
        >
          <ParticipantIdentity avatarClassName="size-7 text-xs" participant={participant} />
        </motion.li>
      ))}
    </ul>
  );
}
