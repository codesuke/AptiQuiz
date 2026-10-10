"use client";

import type { LobbyParticipant, LobbySnapshot } from "@aptiquiz/contracts";
import { Hourglass, Lightbulb, Play, Radio } from "lucide-react";
import { FinalResults } from "@/components/results/final-results";
import { GettingReady } from "@/components/round/getting-ready";
import { LiveStage } from "@/components/round/live-motion";
import { SoundToggle, useLiveSoundCues } from "@/components/round/live-sound-provider";
import { ParticipantRound } from "@/components/round/participant-round";
import { isMatchFinished } from "@/components/round/round-view";
import type { SendRoundAnswer } from "@/lib/room-socket";
import type { ReceivedRound } from "@/lib/server-clock";
import { ActiveRoster, UtilityPanel, UtilityRow } from "./active-room-panels";
import { fieldErrorClass } from "./form-styles";
import { RoomFacts, ScoringRuleCard } from "./lobby-details";

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface ParticipantRoomViewProps {
  readonly participant: LobbyParticipant;
  readonly lobby: LobbySnapshot;
  readonly lobbyReceivedAt: number;
  readonly round: ReceivedRound | null;
  /** Points from revealed Rounds, from the server's revealed scores. */
  readonly score: number;
  readonly connection: ConnectionStatus;
  readonly error: string | null;
  readonly sendAnswer: SendRoundAnswer;
}

/**
 * A joined Participant's Room for every phase. The quiz area leads at full width; the Room
 * details and the roster follow below it. There are no Host or sharing controls here.
 */
export function ParticipantRoomView(props: ParticipantRoomViewProps) {
  const { participant, lobby, lobbyReceivedAt, round } = props;
  useLiveSoundCues(lobby, round, lobbyReceivedAt);
  const showsResults = isMatchFinished(lobby) || lobby.phase === "FINALIZING_RESULTS";

  return (
    <div className="grid min-w-0 gap-5 lg:gap-7">
      <ParticipantBar {...props} />
      {showsResults ? (
        <LiveStage key={lobby.phase}>
          <FinalResults results={lobby.results} viewerId={participant.participantId} />
        </LiveStage>
      ) : (
        <>
          <div className="min-w-0 space-y-5">
            <ParticipantStage {...props} />
            {props.error === null ? null : (
              <p className={`${fieldErrorClass} rounded-xl bg-[#fdecea] px-4 py-3`} role="alert">
                {props.error}
              </p>
            )}
          </div>
          <UtilityRow>
            <UtilityPanel order={0}>
              <ParticipantRoomDetails lobby={lobby} />
            </UtilityPanel>
            <UtilityPanel order={1}>
              <ActiveRoster
                emptyMessage="No players have joined yet."
                participants={lobby.participants}
              />
            </UtilityPanel>
          </UtilityRow>
        </>
      )}
    </div>
  );
}

function ParticipantBar({ participant, score, connection }: ParticipantRoomViewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[var(--aq-ink)] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e65c00] font-[family-name:var(--aq-font-display)] text-2xl"
        >
          {participant.displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#d0ddd5]">
            Joined as
          </p>
          <p className="truncate font-[family-name:var(--aq-font-display)] text-3xl">
            {participant.displayName}
          </p>
        </div>
      </div>
      <p className="font-mono text-sm text-[#fdfbf7]">Score: {score}</p>
      <SoundToggle />
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm text-[#d0ddd5]"
        role="status"
      >
        <Radio
          aria-hidden="true"
          className={connection === "online" ? "size-4 text-emerald-300" : "size-4 text-amber-300"}
        />
        {connection === "online" ? "Connected · Ready to play" : "Reconnecting…"}
      </p>
    </div>
  );
}

/** The quiz area: the Lobby wait, Getting ready, or the current Round. */
function ParticipantStage({
  participant,
  lobby,
  lobbyReceivedAt,
  round,
  connection,
  sendAnswer,
}: ParticipantRoomViewProps) {
  if (lobby.phase === "GETTING_READY" && lobby.ready) {
    return (
      <LiveStage key={`ready-${lobby.ready.questionIndex}`}>
        <GettingReady key={lobby.ready.endsAt} ready={lobby.ready} receivedAt={lobbyReceivedAt} />
      </LiveStage>
    );
  }
  if (round !== null) {
    return (
      <LiveStage key={`${round.view.phase}-${round.view.questionIndex}`}>
        <ParticipantRound
          online={connection === "online"}
          participantId={participant.participantId}
          round={round}
          sendAnswer={sendAnswer}
        />
      </LiveStage>
    );
  }
  return (
    <div aria-live="polite" role="status">
      {lobby.phase === "LOBBY" ? <WaitingForHost /> : <MatchStartedNotice />}
    </div>
  );
}

function MatchStartedNotice() {
  return (
    <p className="flex items-center gap-3 rounded-lg border border-[var(--aq-rule)] bg-[var(--aq-surface)] px-4 py-3 font-semibold text-[var(--aq-ink)]">
      <Play aria-hidden="true" className="size-4 shrink-0 text-[#b84700]" />
      The Host started the match. Questions will appear here.
    </p>
  );
}

function WaitingForHost() {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-[var(--aq-rule)] bg-white px-6 py-12 text-center sm:min-h-[28rem]">
      <Hourglass aria-hidden="true" className="size-14 text-[var(--aq-action)]" />
      <h2 className="mt-5 font-[family-name:var(--aq-font-display)] text-3xl tracking-[-0.04em] text-[var(--aq-ink)] sm:text-4xl">
        Waiting for the Host to start
      </h2>
      <p className="mt-3 max-w-md leading-7 text-[var(--aq-text-muted)]">
        You’re all set. Keep this page open and stay connected; the first Question will appear here.
      </p>
      <p className="mt-10 flex items-center gap-3 rounded-lg bg-[var(--aq-surface)] px-5 py-4 text-left text-sm text-[var(--aq-text-muted)]">
        <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-[var(--aq-action)]" /> Get
        ready to answer quickly when the first Question appears.
      </p>
    </div>
  );
}

function ParticipantRoomDetails({ lobby }: { readonly lobby: LobbySnapshot }) {
  return (
    <section
      aria-labelledby="participant-room-details-heading"
      className="h-full rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"
    >
      <h2
        className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em] text-[var(--aq-ink)]"
        id="participant-room-details-heading"
      >
        Room details
      </h2>
      <div className="mt-4">
        <RoomFacts lobby={lobby} />
      </div>
      <div className="mt-6 border-t border-[var(--aq-rule)] pt-5">
        <ScoringRuleCard embedded lobby={lobby} />
      </div>
    </section>
  );
}
