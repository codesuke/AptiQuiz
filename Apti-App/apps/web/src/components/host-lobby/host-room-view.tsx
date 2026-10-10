"use client";

import type { LobbySnapshot, RoomError } from "@aptiquiz/contracts";
import { LobbyDetails } from "@/components/lobby/lobby-details";
import { FinalResults } from "@/components/results/final-results";
import { LiveStage } from "@/components/round/live-motion";
import { SoundToggle } from "@/components/round/live-sound-provider";
import { isMatchFinished } from "@/components/round/round-view";
import { describeRoomError } from "@/lib/rooms-client";
import type { ReceivedRound } from "@/lib/server-clock";
import { HostActiveRoom } from "./host-active-room";
import { ShareRoom } from "./share-room";
import type { HostConnection, StartState } from "./use-host-room";

export interface HostRoomViewProps {
  readonly lobby: LobbySnapshot | null;
  readonly lobbyReceivedAt: number;
  readonly round: ReceivedRound | null;
  readonly connection: HostConnection;
  readonly roomError: RoomError | null;
  readonly registrationFailed: boolean;
  readonly start: StartState;
  readonly onStart: () => void;
  readonly joinCode: string;
  /** Empty until the browser origin is known. */
  readonly joinLink: string;
  readonly collegeName: string;
  readonly questionSetTitle: string;
}

/** The Host's Room for every phase: Lobby sharing, the active match, and final Results. */
export function HostRoomView(props: HostRoomViewProps) {
  const { lobby } = props;
  if (lobby && (lobby.phase === "FINALIZING_RESULTS" || isMatchFinished(lobby))) {
    return (
      <>
        <div className="mb-4 flex justify-end">
          <SoundToggle />
        </div>
        <LiveStage key={lobby.phase}>
          <FinalResults results={lobby.results} viewerId={null} />
        </LiveStage>
      </>
    );
  }

  return (
    <>
      <HostRoomHeader {...props} />
      {lobby && lobby.phase !== "LOBBY" ? (
        <HostActiveRoom
          joinLink={props.joinLink}
          lobby={lobby}
          lobbyReceivedAt={props.lobbyReceivedAt}
          round={props.round}
        />
      ) : (
        <HostLobbyStage {...props} />
      )}
    </>
  );
}

function HostRoomHeader({
  lobby,
  connection,
  registrationFailed,
  roomError,
  questionSetTitle,
  collegeName,
}: HostRoomViewProps) {
  const inLobby = lobby?.phase === "LOBBY";
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-9">
      <div className="min-w-0">
        <p className="sr-only">
          {!lobby ? "Opening Room" : inLobby ? "Your live lobby" : "Host view"}
        </p>
        <h1 className="font-[family-name:var(--aq-font-display)] text-[clamp(2.9rem,4.5vw,4.4rem)] leading-[1.05] tracking-[-0.055em]">
          {!lobby
            ? "Getting your Room ready."
            : inLobby
              ? "The Room is ready."
              : "The match is underway."}
        </h1>
        <p className="mt-3 text-base text-[var(--aq-text-muted)] sm:text-lg">
          {questionSetTitle} <span aria-hidden="true">·</span> {collegeName}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SoundToggle />
        <RoomStatus
          connection={connection}
          registrationFailed={registrationFailed}
          roomError={roomError}
        />
      </div>
    </div>
  );
}

/** Before the match: the Lobby sharing panel beside the roster and Start. */
function HostLobbyStage({
  lobby,
  connection,
  start,
  onStart,
  joinCode,
  joinLink,
  collegeName,
}: HostRoomViewProps) {
  const canStart = lobby?.phase === "LOBBY" && connection === "online" && !start.pending;
  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-7">
      <ShareRoom collegeName={collegeName} joinCode={joinCode} joinLink={joinLink} />
      <div className="min-w-0">
        {lobby ? (
          <LobbyDetails
            action={<StartControl canStart={canStart} onStart={onStart} start={start} />}
            lobby={lobby}
          />
        ) : (
          <p
            className="rounded-xl border border-dashed border-[var(--aq-rule)] p-6 text-center text-[var(--aq-text-muted)]"
            role="status"
          >
            Opening the Lobby…
          </p>
        )}
      </div>
    </div>
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
