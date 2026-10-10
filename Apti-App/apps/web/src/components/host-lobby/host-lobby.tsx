"use client";

import type { RoomError } from "@aptiquiz/contracts";
import { LobbyDetails } from "@/components/lobby/lobby-details";
import { RoundQuestion } from "@/components/round/round-question";
import { describeRoomError } from "@/lib/rooms-client";
import { ShareRoom } from "./share-room";
import { type HostConnection, type StartState, useHostRoom } from "./use-host-room";

interface HostLobbyProps {
  readonly roomId: string;
  readonly joinCode: string;
  readonly collegeName: string;
  readonly registrationFailed: boolean;
}

export function HostLobby({ roomId, joinCode, collegeName, registrationFailed }: HostLobbyProps) {
  const { lobby, round, connection, roomError, start, startMatch } = useHostRoom(roomId);
  const inLobby = lobby?.phase === "LOBBY";
  const canStart = inLobby && connection === "online" && !start.pending;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <ShareRoom collegeName={collegeName} joinCode={joinCode} />
      <div className="min-w-0 space-y-6">
        <RoomStatus
          connection={connection}
          registrationFailed={registrationFailed}
          roomError={roomError}
        />
        <section
          aria-labelledby="start-heading"
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold" id="start-heading">
            Start the match
          </h2>
          {lobby && !inLobby ? (
            <p className="mt-2 font-medium text-emerald-800" role="status">
              Match started.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-stone-600">
                Start when everyone has joined. Nobody can join after the match starts.
              </p>
              <button
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#b84700] px-6 font-semibold text-white hover:bg-[#993a00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84700] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={!canStart}
                onClick={startMatch}
                type="button"
              >
                {startButtonLabel(start)}
              </button>
            </>
          )}
          <div aria-live="assertive" className="mt-3 min-h-5">
            {start.error ? (
              <p className="text-sm text-red-800" role="alert">
                {describeRoomError(start.error)}
              </p>
            ) : null}
          </div>
        </section>
        {round ? <RoundQuestion round={round} /> : null}
        {lobby ? (
          <LobbyDetails lobby={lobby} />
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-stone-600">
            Opening the Lobby…
          </p>
        )}
      </div>
    </div>
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
        <p className="text-sm text-stone-600">
          {props.connection === "online"
            ? "Connected to the Game Server."
            : "Connecting to the Game Server…"}
        </p>
      )}
    </div>
  );
}
