"use client";

import type { ClientToServerEvents, ServerToClientEvents } from "@aptiquiz/contracts";
import { Radio } from "lucide-react";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useGameConnection } from "@/stores/game-connection";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function GameServerStatus() {
  const { status, roundTripMs, setConnection } = useGameConnection();

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:3001";
    const socket: GameSocket = io(serverUrl, {
      reconnection: true,
      transports: ["websocket"],
    });

    socket.on("server:ready", () => {
      const clientSentAt = Date.now();
      socket.emit("time:ping", { clientSentAt }, (response) => {
        if (response.ok) {
          setConnection("online", Date.now() - clientSentAt);
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

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-sm text-stone-600 shadow-sm backdrop-blur">
      <Radio
        aria-hidden="true"
        className={status === "online" ? "size-4 text-emerald-400" : "size-4 text-amber-400"}
      />
      <span>
        Game server {status}
        {roundTripMs === null ? "" : ` · ${roundTripMs} ms`}
      </span>
    </div>
  );
}
