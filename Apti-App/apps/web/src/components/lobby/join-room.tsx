"use client";

import type { LobbyParticipant, LobbySnapshot, RoomJoin } from "@aptiquiz/contracts";
import { CircleCheck, Hourglass, Play, Radio } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { ParticipantRound } from "@/components/round/participant-round";
import { joinFailureMessage, parseDisplayNameInput } from "@/lib/room-errors";
import {
  createRoomSocket,
  emitRoomJoin,
  type JoinResult,
  parseLobbyUpdate,
  parseRoundUpdate,
  type RoomSocket,
  type SendRoomJoin,
  type SendRoundAnswer,
} from "@/lib/room-socket";
import { type ReceivedRound, receiveRound } from "@/lib/server-clock";
import { fieldErrorClass, primaryButtonClass, textInputClass } from "./form-styles";
import {
  createIdempotencyKey,
  type FailedJoin,
  type JoinStorage,
  nextJoinKey,
  readStoredJoin,
  rememberJoin,
  settleStoredJoin,
} from "./join-key";
import { LobbyDetails } from "./lobby-details";

type ConnectionStatus = "connecting" | "online" | "offline";

interface JoinedRoom {
  readonly participant: LobbyParticipant;
  readonly lobby: LobbySnapshot;
  readonly round: ReceivedRound | null;
}

type JoinSuccess = Extract<JoinResult, { ok: true }>;

function toJoinedRoom({ participant, lobby, round }: JoinSuccess): JoinedRoom {
  return { participant, lobby, round: round === null ? null : receiveRound(round, Date.now()) };
}

interface JoinRoomProps {
  readonly joinCode: string;
  readonly defaultDisplayName: string;
}

/** Generous cap; the schema enforces 32 after trimming and explains the rule. */
const DISPLAY_NAME_INPUT_LIMIT = 64;
const NOT_CONNECTED_MESSAGE = "Still connecting to the game server. Try again in a moment.";

/** Resolves `sessionStorage` per call so a blocked storage throws inside the join-key guards. */
const tabJoinStorage: JoinStorage = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key),
};

function sendJoinVia(socket: RoomSocket): SendRoomJoin {
  return (payload, acknowledge) => {
    socket.emit("room:join", payload, acknowledge);
  };
}

export function JoinRoom({ joinCode, defaultDisplayName }: JoinRoomProps) {
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [joined, setJoined] = useState<JoinedRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const socketRef = useRef<RoomSocket | null>(null);
  const joinedAttemptRef = useRef<RoomJoin | null>(null);

  const rejoin = useCallback(async (socket: RoomSocket, attempt: RoomJoin) => {
    const result = await emitRoomJoin(sendJoinVia(socket), attempt);
    setRestoring(false);
    setConnection("online");

    if (result.ok) {
      joinedAttemptRef.current = attempt;
      setJoined(toJoinedRoom(result));
      setError(null);
      return;
    }

    settleStoredJoin(tabJoinStorage, attempt.joinCode, result.error);
    setError(joinFailureMessage(result.error));
  }, []);

  useEffect(() => {
    // Read after mount: sessionStorage does not exist during server rendering.
    if (readStoredJoin(tabJoinStorage, joinCode) !== null) setRestoring(true);
    const socket = createRoomSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      // A reconnect or a page refresh is a new socket on the server: the same key returns the
      // same Participant and puts this socket back into the Room's channels. Until that rejoin
      // is acknowledged the socket is not a Participant, so an Answer sent now would be refused.
      const attempt = joinedAttemptRef.current ?? readStoredJoin(tabJoinStorage, joinCode);
      if (attempt === null) setConnection("online");
      else void rejoin(socket, attempt);
    });
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));
    socket.on("room:lobby", (payload) => {
      setJoined((current) => {
        if (current === null) return current;
        const lobby = parseLobbyUpdate(payload, current.lobby.roomId);
        return lobby === null ? current : { ...current, lobby };
      });
    });
    socket.on("round:state", (payload) => {
      const receivedAt = Date.now();
      setJoined((current) => {
        if (current === null) return current;
        const view = parseRoundUpdate(payload, current.lobby.roomId);
        return view === null ? current : { ...current, round: receiveRound(view, receivedAt) };
      });
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [joinCode, rejoin]);

  // A missing socket sends nothing, so the acknowledgement timeout reports no_response.
  const sendAnswer = useCallback<SendRoundAnswer>((payload, acknowledge) => {
    socketRef.current?.emit("round:answer", payload, acknowledge);
  }, []);

  const handleJoined = useCallback((attempt: RoomJoin, room: JoinedRoom) => {
    joinedAttemptRef.current = attempt;
    setJoined(room);
  }, []);

  if (joined === null) {
    return (
      <DisplayNameForm
        connection={connection}
        defaultDisplayName={defaultDisplayName}
        joinCode={joinCode}
        onJoined={handleJoined}
        restoreError={error}
        restoring={restoring}
        socketRef={socketRef}
      />
    );
  }

  return (
    <JoinedLobby connection={connection} error={error} joined={joined} sendAnswer={sendAnswer} />
  );
}

interface DisplayNameFormProps {
  readonly connection: ConnectionStatus;
  readonly defaultDisplayName: string;
  readonly joinCode: string;
  readonly onJoined: (attempt: RoomJoin, room: JoinedRoom) => void;
  /** Why replaying this tab's earlier join failed, shown until the form reports its own error. */
  readonly restoreError: string | null;
  readonly restoring: boolean;
  readonly socketRef: { readonly current: RoomSocket | null };
}

function DisplayNameForm({
  connection,
  defaultDisplayName,
  joinCode,
  onJoined,
  restoreError,
  restoring,
  socketRef,
}: DisplayNameFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const failedRef = useRef<FailedJoin | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const name = parseDisplayNameInput(displayName);
    if (!name.ok) {
      setError(name.message);
      return;
    }

    const socket = socketRef.current;
    if (socket === null || !socket.connected) {
      setError(NOT_CONNECTED_MESSAGE);
      return;
    }

    // A kept attempt may already hold a Participant on the server, so its key is reused.
    const storedKey = readStoredJoin(tabJoinStorage, joinCode)?.idempotencyKey;
    const attempt: RoomJoin = {
      joinCode,
      displayName: name.value,
      idempotencyKey: storedKey ?? nextJoinKey(failedRef.current, createIdempotencyKey),
    };
    rememberJoin(tabJoinStorage, attempt);
    setPending(true);
    setError(null);
    const result = await emitRoomJoin(sendJoinVia(socket), attempt);
    setPending(false);

    if (result.ok) {
      failedRef.current = null;
      onJoined(attempt, toJoinedRoom(result));
      return;
    }

    failedRef.current = { key: attempt.idempotencyKey, failure: result.error };
    settleStoredJoin(tabJoinStorage, joinCode, result.error);
    setError(joinFailureMessage(result.error));
  }

  const isConnected = connection === "online";
  const shownError = error ?? restoreError;
  const busy = pending || restoring;

  return (
    <form
      aria-busy={busy}
      className="max-w-md rounded-2xl border border-[#e4dfd3] bg-[#f7f4eb] p-5 sm:p-7"
      noValidate
      onSubmit={handleSubmit}
    >
      <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#627169]">
        Room <span className="text-[#b84700]">{joinCode}</span>
      </p>
      <label className="mt-4 block font-semibold text-[#172823]" htmlFor={inputId}>
        Display name
      </label>
      <p className="mt-1 text-sm leading-6 text-[#526159]" id={hintId}>
        2 to 32 characters. Other players in the Room will see it.
      </p>
      <input
        aria-describedby={`${hintId} ${errorId}`}
        aria-invalid={shownError !== null}
        autoComplete="nickname"
        className={`${textInputClass} mt-3`}
        disabled={busy}
        id={inputId}
        maxLength={DISPLAY_NAME_INPUT_LIMIT}
        onChange={(event) => setDisplayName(event.target.value)}
        value={displayName}
      />
      <p aria-live="polite" className={`${fieldErrorClass} mt-2 min-h-6`} id={errorId}>
        {shownError}
      </p>
      <button
        className={`${primaryButtonClass} mt-3 w-full`}
        disabled={busy || !isConnected}
        type="submit"
      >
        {restoring
          ? "Rejoining…"
          : pending
            ? "Joining…"
            : isConnected
              ? "Join Room"
              : "Connecting…"}
      </button>
      <ConnectionNote connection={connection} />
    </form>
  );
}

function ConnectionNote({ connection }: { readonly connection: ConnectionStatus }) {
  const label =
    connection === "online"
      ? "Connected to the game server."
      : connection === "offline"
        ? "Can't reach the game server. Retrying…"
        : "Connecting to the game server…";

  return (
    <p
      aria-live="polite"
      className="mt-4 flex items-center gap-2 text-sm text-[#526159]"
      role="status"
    >
      <Radio
        aria-hidden="true"
        className={connection === "online" ? "size-4 text-emerald-600" : "size-4 text-amber-600"}
      />
      {label}
    </p>
  );
}

interface JoinedLobbyProps {
  readonly connection: ConnectionStatus;
  readonly error: string | null;
  readonly joined: JoinedRoom;
  readonly sendAnswer: SendRoundAnswer;
}

function JoinedLobby({ connection, error, joined, sendAnswer }: JoinedLobbyProps) {
  const { participant, lobby, round } = joined;
  const hasStarted = lobby.phase !== "LOBBY";

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-[#19352d] px-5 py-4 text-[#fdfbf7] sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-center gap-3 text-lg font-semibold">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-[#ffb380]" />
          <span className="min-w-0 truncate">You're in as {participant.displayName}</span>
        </p>
        <p
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-[#d0ddd5]"
          role="status"
        >
          <Radio
            aria-hidden="true"
            className={
              connection === "online" ? "size-4 text-emerald-300" : "size-4 text-amber-300"
            }
          />
          {connection === "online" ? "Live" : "Reconnecting…"}
        </p>
      </div>

      {round === null ? (
        <div aria-live="polite" role="status">
          {hasStarted ? (
            <p className="flex items-center gap-3 rounded-xl border-l-2 border-[#e65c00] bg-[#fff3ea] px-4 py-3 font-semibold text-[#172823]">
              <Play aria-hidden="true" className="size-4 shrink-0 text-[#b84700]" />
              The Host started the match. Questions will appear here.
            </p>
          ) : (
            <p className="flex items-center gap-3 px-1 text-[#526159]">
              <Hourglass aria-hidden="true" className="size-4 shrink-0 text-[#627169]" />
              Waiting for the Host to start the match.
            </p>
          )}
        </div>
      ) : (
        <ParticipantRound online={connection === "online"} round={round} sendAnswer={sendAnswer} />
      )}

      {error === null ? null : (
        <p className={`${fieldErrorClass} rounded-xl bg-[#fdecea] px-4 py-3`} role="alert">
          {error}
        </p>
      )}

      <LobbyDetails lobby={lobby} />
    </div>
  );
}
