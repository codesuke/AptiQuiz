import type { ConnectionIdentity } from "@aptiquiz/contracts";
import { create } from "zustand";

export type ConnectionStatus = "connecting" | "online" | "offline";

interface GameConnectionState {
  status: ConnectionStatus;
  roundTripMs: number | null;
  identity: ConnectionIdentity | null;
  setConnection(
    status: ConnectionStatus,
    roundTripMs?: number | null,
    identity?: ConnectionIdentity | null,
  ): void;
}

export const useGameConnection = create<GameConnectionState>((set) => ({
  status: "connecting",
  roundTripMs: null,
  identity: null,
  setConnection: (status, roundTripMs = null, identity = null) =>
    set({ status, roundTripMs, identity }),
}));
