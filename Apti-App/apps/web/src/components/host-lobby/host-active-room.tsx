"use client";

import type { LobbyParticipant, LobbySnapshot, RevealedRound } from "@aptiquiz/contracts";
import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";
import type { ReactNode } from "react";
import { participantCountLabel, questionCountLabel } from "@/components/lobby/lobby-copy";
import { ParticipantIdentity, ScoringRuleCard } from "@/components/lobby/lobby-details";
import { GettingReady } from "@/components/round/getting-ready";
import { Leaderboard } from "@/components/round/leaderboard";
import { LiveStage } from "@/components/round/live-motion";
import { revealOutcome } from "@/components/round/reveal-outcome";
import { RoundQuestion } from "@/components/round/round-question";
import type { ReceivedRound } from "@/lib/server-clock";
import { JoinQrCode } from "./join-qr";
import { RevealHighlights } from "./reveal-highlights";

export const JOINING_CLOSED_MESSAGE = "Match in progress — joining is closed.";

// The roster shows about this many compact rows before it scrolls.
const ROSTER_VISIBLE_ROWS = 7;
// Readable from the Host's screen; joining is closed, so it is a reference, not a call to scan.
const ACTIVE_QR_SIZE_PX = 132;
const EASE_STANDARD = [0.2, 0, 0, 1] as const;
const PANEL_STAGGER_S = 0.08;
const ROW_STAGGER_S = 0.025;
const MAX_STAGGERED_ROWS = 10;

interface HostActiveRoomProps {
  readonly lobby: LobbySnapshot;
  readonly lobbyReceivedAt: number;
  readonly round: ReceivedRound | null;
  readonly joinLink: string;
}

/**
 * Getting ready, Question, and reveal phases for the Host. The Question leads at full width,
 * the revealed Leaderboard follows, and a utility row holds the Room details and roster.
 */
export function HostActiveRoom({ lobby, lobbyReceivedAt, round, joinLink }: HostActiveRoomProps) {
  const revealed = round?.view.phase === "QUESTION_REVEAL" ? round.view : null;
  return (
    <div className="grid min-w-0 gap-5 lg:gap-7">
      <HostStage lobby={lobby} lobbyReceivedAt={lobbyReceivedAt} round={round} />
      {revealed && lobby.phase !== "GETTING_READY" ? (
        <LiveStage key={`standings-${revealed.questionIndex}`}>
          <HostRevealStandings view={revealed} />
        </LiveStage>
      ) : null}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-7">
        <UtilityPanel order={0}>
          <ActiveRoomDetails joinLink={joinLink} lobby={lobby} />
        </UtilityPanel>
        <UtilityPanel order={1}>
          <ActiveRoster participants={lobby.participants} />
        </UtilityPanel>
      </div>
    </div>
  );
}

function HostStage({
  lobby,
  lobbyReceivedAt,
  round,
}: Pick<HostActiveRoomProps, "lobby" | "lobbyReceivedAt" | "round">) {
  if (lobby.phase === "GETTING_READY" && lobby.ready) {
    return (
      <LiveStage key={`ready-${lobby.ready.questionIndex}`}>
        <GettingReady ready={lobby.ready} receivedAt={lobbyReceivedAt} />
      </LiveStage>
    );
  }
  if (!round) return null;
  return (
    <LiveStage key={`${round.view.phase}-${round.view.questionIndex}`}>
      <RoundQuestion round={round} />
    </LiveStage>
  );
}

/** The Round outcome highlights above the cumulative standings, both from server data. */
function HostRevealStandings({ view }: { readonly view: RevealedRound }) {
  const outcome = revealOutcome(view.scores);
  return (
    <section
      aria-labelledby="reveal-standings-heading"
      className="rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-8"
    >
      <h2
        className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)] sm:text-3xl"
        id="reveal-standings-heading"
      >
        Standings after Question {view.questionIndex + 1}
      </h2>
      <div className="mt-5">
        <RevealHighlights outcome={outcome} />
      </div>
      <Leaderboard
        entries={view.leaderboard}
        roundPoints={outcome.pointsByParticipant}
        viewerId={null}
      />
    </section>
  );
}

/** Panels rise in one after another; content is visible from the first frame. */
function UtilityPanel({
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
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : order * PANEL_STAGGER_S,
        ease: EASE_STANDARD,
      }}
    >
      {children}
    </motion.div>
  );
}

function ActiveRoomDetails({
  lobby,
  joinLink,
}: {
  readonly lobby: LobbySnapshot;
  readonly joinLink: string;
}) {
  return (
    <section
      aria-labelledby="active-room-details-heading"
      className="h-full rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)]"
          id="active-room-details-heading"
        >
          Room details
        </h2>
        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--aq-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--aq-ink)]">
          <LiveDot />
          {JOINING_CLOSED_MESSAGE}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-5 sm:flex-nowrap">
        <div className="shrink-0 rounded-lg border border-[var(--aq-rule)] bg-white p-1.5 transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <JoinQrCode className="w-33" joinLink={joinLink} sizePx={ACTIVE_QR_SIZE_PX} />
        </div>
        <dl className="grid min-w-0 flex-1 gap-3">
          <div className="min-w-0">
            <dt className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[var(--aq-text-muted)]">
              Join Code
            </dt>
            <dd className="mt-1 break-all font-mono text-[clamp(1.9rem,3vw,2.6rem)] font-semibold leading-none tracking-[0.08em] text-[var(--aq-action)]">
              {lobby.joinCode}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">College and Questions</dt>
            <dd className="text-sm leading-6 text-[var(--aq-text-muted)]">
              {lobby.college.name} <span aria-hidden="true">·</span>{" "}
              {questionCountLabel(lobby.questionCount)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 border-t border-[var(--aq-rule)] pt-5">
        <ScoringRuleCard embedded lobby={lobby} />
      </div>
    </section>
  );
}

/** A small live signal; the ring stays still for reduced-motion preferences. */
function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex size-2.5">
      <span className="absolute inline-flex size-full rounded-full bg-[var(--aq-brand-orange)] opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2.5 rounded-full bg-[var(--aq-brand-orange)]" />
    </span>
  );
}

function ActiveRoster({ participants }: { readonly participants: readonly LobbyParticipant[] }) {
  const scrolls = participants.length > ROSTER_VISIBLE_ROWS;
  return (
    <section
      aria-labelledby="active-roster-heading"
      className="flex h-full flex-col rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-2 font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)]"
          id="active-roster-heading"
        >
          <Users aria-hidden="true" className="size-5 text-[#627169]" />
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
          No players joined this Room.
        </p>
      ) : (
        <>
          <section
            aria-label="Participant roster"
            className="mt-3 max-h-[19.75rem] overflow-y-auto overscroll-contain rounded-lg [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)]"
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
            duration: reduceMotion ? 0 : 0.24,
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
