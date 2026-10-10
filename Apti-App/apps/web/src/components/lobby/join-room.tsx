"use client";

import type { LobbyParticipant, LobbySnapshot, RoomJoin } from "@aptiquiz/contracts";
import { CircleCheck, Hourglass, Play, Radio } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { ParticipantRound } from "@/components/round/participant-round";
import { isMatchFinished, nextRound } from "@/components/round/round-view";
import { joinFailureMessage, parseDisplayNameInput } from "@/lib/room-errors";
import {
  createRoomSocket,
  emitRoomJoin,
  emitRoomResume,
  type JoinResult,
  parseLobbyUpdate,
  parseRoundUpdate,
  type ResumeResult,
  type RoomSocket,
  type SendRoomJoin,
  type SendRoomResume,
  type SendRoundAnswer,
} from "@/lib/room-socket";
import { type ReceivedRound, receiveRound } from "@/lib/server-clock";
import { fieldErrorClass, primaryButtonClass, textInputClass } from "./form-styles";
import {
  createIdempotencyKey,
  type FailedJoin,
  forgetStoredJoin,
  type JoinStorage,
  nextJoinKey,
  readStoredJoin,
  rememberJoin,
  settleStoredJoin,
} from "./join-key";
import { LobbyDetails } from "./lobby-details";
import {
  forgetResumeToken,
  nextReconnectStep,
  readResumeToken,
  rememberResumeToken,
  resumeFallback,
} from "./resume-token";

type ConnectionStatus = "connecting" | "online" | "offline";

interface JoinedRoom {
  readonly participant: LobbyParticipant;
  readonly lobby: LobbySnapshot;
  readonly round: ReceivedRound | null;
  /** Points from revealed Rounds, as of the latest resume; a fresh join starts at 0. */
  readonly score: number;
}

type JoinSuccess = Extract<JoinResult, { ok: true }>;
type ResumeSuccess = Extract<ResumeResult, { ok: true }>;

function toJoinedRoom(
  { participant, lobby, round }: JoinSuccess | ResumeSuccess,
  score: number,
): JoinedRoom {
  const receivedRound = round === null ? null : receiveRound(round, Date.now());
  return { participant, lobby, round: receivedRound, score };
}

interface JoinRoomProps {
  readonly joinCode: string;
  readonly defaultDisplayName: string;
}

/** Generous cap; the schema enforces 32 after trimming and explains the rule. */
const DISPLAY_NAME_INPUT_LIMIT = 64;
const NOT_CONNECTED_MESSAGE = "Still connecting to the game server. Try again in a moment.";
const RESUME_RETRY_MESSAGE = "Restoring your place in the Room. Retrying…";
const RESUME_RETRY_DELAY_MS = 2_000;
/** About ten seconds of retries; after that the page waits for a refresh instead of looping. */
const MAX_RESUME_RETRIES = 5;
const RESUME_GAVE_UP_MESSAGE =
  "We couldn't restore your place in the Room. Refresh the page to try again.";

/** Resolves `sessionStorage` per call so a blocked storage throws inside the join-key guards. */
const tabJoinStorage: JoinStorage = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key),
};

/** `localStorage` keeps the Resume Token across a refresh and a closed tab. */
const resumeTokenStorage: JoinStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

function sendJoinVia(socket: RoomSocket): SendRoomJoin {
  return (payload, acknowledge) => {
    socket.emit("room:join", payload, acknowledge);
  };
}

function sendResumeVia(socket: RoomSocket): SendRoomResume {
  return (payload, acknowledge) => {
    socket.emit("room:resume", payload, acknowledge);
  };
}

export function JoinRoom({ joinCode, defaultDisplayName }: JoinRoomProps) {
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [joined, setJoined] = useState<JoinedRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const socketRef = useRef<RoomSocket | null>(null);
  /** Covers reconnects of this page when `localStorage` is blocked. */
  const resumeTokenRef = useRef<string | null>(null);

  const keepResumeToken = useCallback(
    (token: string) => {
      resumeTokenRef.current = token;
      // Once the token is stored, the pending join attempt is no longer needed to reclaim.
      if (rememberResumeToken(resumeTokenStorage, joinCode, token)) {
        forgetStoredJoin(tabJoinStorage, joinCode);
      }
    },
    [joinCode],
  );

  useEffect(() => {
    // Read after mount: browser storage does not exist during server rendering.
    const hasStoredPlace =
      readResumeToken(resumeTokenStorage, joinCode) !== null ||
      readStoredJoin(tabJoinStorage, joinCode) !== null;
    if (hasStoredPlace) setRestoring(true);
    const socket = createRoomSocket();
    socketRef.current = socket;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let resumeRetries = 0;

    const isCurrent = () => socketRef.current === socket && socket.connected;

    function dropResumeToken() {
      resumeTokenRef.current = null;
      forgetResumeToken(resumeTokenStorage, joinCode);
    }

    async function rejoin(attempt: RoomJoin) {
      const result = await emitRoomJoin(sendJoinVia(socket), attempt);
      if (!isCurrent()) return;
      setRestoring(false);
      setConnection("online");

      if (result.ok) {
        keepResumeToken(result.resumeToken);
        setJoined((current) => toJoinedRoom(result, current?.score ?? 0));
        setError(null);
        return;
      }

      settleStoredJoin(tabJoinStorage, attempt.joinCode, result.error);
      setError(joinFailureMessage(result.error));
    }

    async function resume(resumeToken: string) {
      const result = await emitRoomResume(sendResumeVia(socket), { joinCode, resumeToken });
      if (!isCurrent()) return;

      if (result.ok) {
        resumeRetries = 0;
        setJoined(toJoinedRoom(result, result.score));
        setError(null);
        setRestoring(false);
        setConnection("online");
        return;
      }

      const fallback = resumeFallback(result.error, readStoredJoin(tabJoinStorage, joinCode));
      if (fallback.kind === "retry") {
        resumeRetries += 1;
        if (resumeRetries > MAX_RESUME_RETRIES) {
          // Keep the token: a refresh tries again, and it may still be good.
          setRestoring(false);
          setError(RESUME_GAVE_UP_MESSAGE);
          return;
        }
        // The token may still be good; stay "not online" so no Answer is sent before the reclaim.
        setError(RESUME_RETRY_MESSAGE);
        retryTimer = setTimeout(() => void reclaim(), RESUME_RETRY_DELAY_MS);
        return;
      }

      dropResumeToken();
      setJoined(null);
      if (fallback.kind === "rejoin") {
        await rejoin(fallback.attempt);
        return;
      }
      setRestoring(false);
      setConnection("online");
      setError(joinFailureMessage("invalid_resume_token"));
    }

    // A reconnect or a page refresh is a new socket on the server. Until the reclaim is
    // acknowledged the socket is not a Participant, so an Answer sent now would be refused.
    async function reclaim() {
      if (!isCurrent()) return;
      const resumeToken = resumeTokenRef.current ?? readResumeToken(resumeTokenStorage, joinCode);
      const step = nextReconnectStep(resumeToken, readStoredJoin(tabJoinStorage, joinCode));
      switch (step.kind) {
        case "resume":
          await resume(step.resumeToken);
          return;
        case "rejoin":
          await rejoin(step.attempt);
          return;
        case "none":
          setRestoring(false);
          setConnection("online");
          return;
      }
    }

    socket.on("connect", () => void reclaim());
    socket.on("disconnect", () => {
      clearTimeout(retryTimer);
      setConnection("offline");
    });
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
        if (view === null) return current;
        return { ...current, round: nextRound(current.round, receiveRound(view, receivedAt)) };
      });
    });

    return () => {
      clearTimeout(retryTimer);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [joinCode, keepResumeToken]);

  // A missing socket sends nothing, so the acknowledgement timeout reports no_response.
  const sendAnswer = useCallback<SendRoundAnswer>((payload, acknowledge) => {
    socketRef.current?.emit("round:answer", payload, acknowledge);
  }, []);

  const handleJoined = useCallback(
    (result: JoinSuccess) => {
      keepResumeToken(result.resumeToken);
      setJoined(toJoinedRoom(result, 0));
    },
    [keepResumeToken],
  );

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
  readonly onJoined: (result: JoinSuccess) => void;
  /** Why restoring the earlier place in this Room failed, shown until the form reports its own error. */
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
      onJoined(result);
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
  const finished = isMatchFinished(lobby);

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

      {finished ? (
        <p
          className="rounded-xl border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 font-semibold text-[#172823]"
          role="status"
        >
          Match finished.
        </p>
      ) : null}

      {round !== null ? (
        <ParticipantRound online={connection === "online"} round={round} sendAnswer={sendAnswer} />
      ) : finished ? null : (
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
