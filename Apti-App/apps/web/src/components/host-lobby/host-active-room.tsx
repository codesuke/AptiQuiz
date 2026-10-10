"use client";

import type { LobbySnapshot, RevealedRound } from "@aptiquiz/contracts";
import { ActiveRoster, UtilityPanel, UtilityRow } from "@/components/lobby/active-room-panels";
import { questionCountLabel } from "@/components/lobby/lobby-copy";
import { ScoringRuleCard } from "@/components/lobby/lobby-details";
import { GettingReady } from "@/components/round/getting-ready";
import { Leaderboard } from "@/components/round/leaderboard";
import { LiveStage } from "@/components/round/live-motion";
import { RevealHighlights } from "@/components/round/reveal-highlights";
import { revealOutcome } from "@/components/round/reveal-outcome";
import { RoundQuestion } from "@/components/round/round-question";
import type { ReceivedRound } from "@/lib/server-clock";
import { JoinQrCode } from "./join-qr";

export const JOINING_CLOSED_MESSAGE = "Match in progress — joining is closed.";

// Readable from the Host's screen; joining is closed, so it is a reference, not a call to scan.
const ACTIVE_QR_SIZE_PX = 132;

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
      <UtilityRow>
        <UtilityPanel order={0}>
          <ActiveRoomDetails joinLink={joinLink} lobby={lobby} />
        </UtilityPanel>
        <UtilityPanel order={1}>
          <ActiveRoster
            emptyMessage="No players joined this Room."
            participants={lobby.participants}
          />
        </UtilityPanel>
      </UtilityRow>
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
