"use client";

import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  serverReadySchema,
} from "@aptiquiz/contracts";
import { Radio } from "lucide-react";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { requestSocketAuth } from "@/lib/socket-auth";
import { useGameConnection } from "@/stores/game-connection";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function GameServerStatus() {
  const { status, roundTripMs, identity, setConnection } = useGameConnection();

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:3001";
    const socket: GameSocket = io(serverUrl, {
      auth: (callback) => {
        void requestSocketAuth().then(callback);
      },
      reconnection: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => setConnection("connecting"));

    socket.on("server:ready", (payload) => {
      const ready = serverReadySchema.safeParse(payload);
      if (!ready.success) {
        setConnection("offline");
        return;
      }

      const clientSentAt = Date.now();
      socket.emit("time:ping", { clientSentAt }, (response) => {
        if (response.ok) {
          setConnection("online", Date.now() - clientSentAt, ready.data.identity);
          return;
        }

        setConnection("offline");
      });
    });

    socket.on("connect_error", () => setConnection("offline"));
    socket.on("disconnect", () => setConnection("offline"));

    return () => {
      socket.disconnect();
    };
  }, [setConnection]);

  const identityLabel =
    identity?.kind === "guest"
      ? "Guest"
      : identity?.kind === "user"
        ? `${identity.role === "admin" ? "Admin" : "User"} ${identity.userId}`
        : null;

  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-sm text-stone-600 shadow-sm backdrop-blur">
      <Radio
        aria-hidden="true"
        className={status === "online" ? "size-4 text-emerald-400" : "size-4 text-amber-400"}
      />
      <span className="min-w-0 truncate" title={identityLabel ?? undefined}>
        Game server {status}
        {identityLabel === null ? "" : ` · ${identityLabel}`}
        {roundTripMs === null ? "" : ` · ${roundTripMs} ms`}
      </span>
    </div>
  );
}
