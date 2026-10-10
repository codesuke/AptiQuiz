import { create } from "zustand";

export type ConnectionStatus = "connecting" | "online" | "offline";

interface GameConnectionState {
  status: ConnectionStatus;
  roundTripMs: number | null;
  setConnection(status: ConnectionStatus, roundTripMs?: number | null): void;
}

export const useGameConnection = create<GameConnectionState>((set) => ({
  status: "connecting",
  roundTripMs: null,
  setConnection: (status, roundTripMs = null) => set({ status, roundTripMs }),
}));
