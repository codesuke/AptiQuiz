"use client";

import {
  type LobbySnapshot,
  type RoomError,
  roomHostResponseSchema,
  roomStartResponseSchema,
} from "@aptiquiz/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoomSocket, parseLobbyUpdate, type RoomSocket } from "@/lib/room-socket";

export type HostConnection = "connecting" | "online" | "offline";
export interface StartState {
  pending: boolean;
  error: RoomError | null;
}

// Long enough for a slow mobile link, short enough that a lost acknowledgement can be retried.
const START_ACK_TIMEOUT_MS = 10_000;

/** Connects as the Host, claims the Room's Lobby, and keeps it current until unmount. */
export function useHostRoom(roomId: string) {
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [connection, setConnection] = useState<HostConnection>("connecting");
  const [roomError, setRoomError] = useState<RoomError | null>(null);
  const [start, setStart] = useState<StartState>({ pending: false, error: null });
  const socketRef = useRef<RoomSocket | null>(null);
  // Reused across retries so a lost acknowledgement cannot cause a second start.
  const startKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = createRoomSocket();
    socketRef.current = socket;

    // server:ready arrives on every connection, so a reconnect claims the Lobby again.
    socket.on("server:ready", () => {
      setConnection("online");
      socket.emit("room:host", { roomId }, (response) => {
        const parsed = roomHostResponseSchema.safeParse(response);
        if (!parsed.success) {
          setRoomError("invalid_request");
          return;
        }
        if (!parsed.data.ok) {
          setRoomError(parsed.data.error);
          return;
        }
        setRoomError(null);
        setLobby(parsed.data.lobby);
      });
    });
    socket.on("room:lobby", (payload) => {
      const update = parseLobbyUpdate(payload, roomId);
      if (update) setLobby(update);
    });
    socket.on("connect_error", () => setConnection("offline"));
    socket.on("disconnect", () => setConnection("offline"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const startMatch = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    startKeyRef.current ??= crypto.randomUUID();
    setStart({ pending: true, error: null });
    socket
      .timeout(START_ACK_TIMEOUT_MS)
      .emit("room:start", { roomId, idempotencyKey: startKeyRef.current }, (timedOut, response) => {
        const parsed = roomStartResponseSchema.safeParse(response);
        if (timedOut || !parsed.success) {
          setStart({ pending: false, error: "start_failed" });
          return;
        }
        if (!parsed.data.ok) {
          setStart({ pending: false, error: parsed.data.error });
          return;
        }
        setLobby(parsed.data.lobby);
        setStart({ pending: false, error: null });
      });
  }, [roomId]);

  return { lobby, connection, roomError, start, startMatch };
}
