"use client";

import type { RoomError } from "@aptiquiz/contracts";
import { LobbyDetails, ScoringRuleCard } from "@/components/lobby/lobby-details";
import { FinalResults } from "@/components/results/final-results";
import { GettingReady } from "@/components/round/getting-ready";
import { RoundQuestion } from "@/components/round/round-question";
import { isMatchFinished } from "@/components/round/round-view";
import { describeRoomError } from "@/lib/rooms-client";
import { AdvanceControl } from "./advance-control";
import { ShareRoom } from "./share-room";
import { type HostConnection, type StartState, useHostRoom } from "./use-host-room";

interface HostLobbyProps {
  readonly roomId: string;
  readonly joinCode: string;
  readonly collegeName: string;
  readonly questionSetTitle: string;
  readonly registrationFailed: boolean;
}

export function HostLobby({
  roomId,
  joinCode,
  collegeName,
  questionSetTitle,
  registrationFailed,
}: HostLobbyProps) {
  const { lobby, round, connection, roomError, start, startMatch, advance, advanceMatch } =
    useHostRoom(roomId);
  const inLobby = lobby?.phase === "LOBBY";
  const canStart = inLobby && connection === "online" && !start.pending;

  const matchFinished = lobby ? isMatchFinished(lobby) : false;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-9">
        <div>
          <p className="sr-only">
            {!lobby ? "Opening Room" : inLobby ? "Your live lobby" : "Host view"}
          </p>
          <h1 className="font-[family-name:var(--aq-font-display)] text-[clamp(2.9rem,4.5vw,4.4rem)] leading-[1.05] tracking-[-0.055em]">
            {!lobby
              ? "Getting your Room ready."
              : inLobby
                ? "The Room is ready."
                : matchFinished
                  ? "The match is complete."
                  : "The match is underway."}
          </h1>
          <p className="mt-3 text-base text-[var(--aq-text-muted)] sm:text-lg">
            {questionSetTitle} <span aria-hidden="true">·</span> {collegeName}
          </p>
        </div>
        <RoomStatus
          connection={connection}
          registrationFailed={registrationFailed}
          roomError={roomError}
        />
      </div>

      <div
        className={
          inLobby
            ? "grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-7"
            : "grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(22rem,0.6fr)] lg:gap-7"
        }
      >
        {lobby?.phase === "GETTING_READY" && lobby.ready ? (
          <GettingReady key={lobby.ready.endsAt} ready={lobby.ready} />
        ) : round ? (
          <div className="min-w-0 space-y-4">
            <RoundQuestion round={round} />
            <AdvanceControl
              advance={advance}
              lobby={lobby}
              onAdvance={advanceMatch}
              online={connection === "online"}
              round={round.view}
            />
          </div>
        ) : (
          <ShareRoom collegeName={collegeName} joinCode={joinCode} />
        )}
        <div className={`min-w-0 ${inLobby ? "" : "space-y-5"}`}>
          {lobby && matchFinished ? <FinalResults results={lobby.results} viewerId={null} /> : null}
          {round ? <ShareRoom collegeName={collegeName} joinCode={joinCode} compact /> : null}
          {lobby ? (
            <LobbyDetails
              action={
                inLobby ? (
                  <StartControl canStart={canStart} onStart={startMatch} start={start} />
                ) : undefined
              }
              lobby={lobby}
              compact={!inLobby}
              hostLobby={inLobby}
            />
          ) : (
            <p
              className="rounded-xl border border-dashed border-[var(--aq-rule)] p-6 text-center text-[var(--aq-text-muted)]"
              role="status"
            >
              Opening the Lobby…
            </p>
          )}
          {round && lobby ? (
            <div className="mt-5">
              <ScoringRuleCard lobby={lobby} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function StartControl({
  canStart,
  onStart,
  start,
}: {
  canStart: boolean;
  onStart: () => void;
  start: StartState;
}) {
  return (
    <section aria-labelledby="start-heading">
      <h3
        className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.04em]"
        id="start-heading"
      >
        Ready to begin?
      </h3>
      <p className="mt-1 text-sm leading-6 text-[var(--aq-text-muted)]">
        Start when everyone has joined. Nobody can join after the match starts.
      </p>
      <button
        className="mt-4 inline-flex min-h-13 w-full items-center justify-center rounded-lg bg-[var(--aq-action-prominent)] px-6 font-semibold text-white transition-colors hover:bg-[var(--aq-action-prominent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canStart}
        onClick={onStart}
        type="button"
      >
        {startButtonLabel(start)}
      </button>
      <div aria-live="assertive" className="mt-2 min-h-5">
        {start.error ? (
          <p className="text-sm text-red-800" role="alert">
            {describeRoomError(start.error)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function startButtonLabel(start: StartState) {
  if (start.pending) return "Starting…";
  return start.error ? "Try starting again" : "Start match";
}

interface RoomStatusProps {
  readonly connection: HostConnection;
  readonly registrationFailed: boolean;
  readonly roomError: RoomError | null;
}

function roomProblem({ connection, registrationFailed, roomError }: RoomStatusProps) {
  if (roomError) return describeRoomError(roomError);
  if (registrationFailed && connection !== "online") {
    return "The Game Server is not reachable. Reload the page to try again.";
  }
  if (connection === "offline") return "Connection lost. Reconnecting to the Game Server…";
  return null;
}

function RoomStatus(props: RoomStatusProps) {
  const problem = roomProblem(props);

  return (
    <div aria-live="polite" role="status">
      {problem ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {problem}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--aq-ink)]">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${props.connection === "online" ? "bg-emerald-600" : "bg-amber-500"}`}
          />
          {props.connection === "online"
            ? "Connected · Live and in sync"
            : "Connecting to the live Room…"}
        </p>
      )}
    </div>
  );
}
