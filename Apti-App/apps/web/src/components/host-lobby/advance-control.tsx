"use client";

import type { LobbySnapshot, RoundView } from "@aptiquiz/contracts";
import { describeRoomError } from "@/lib/rooms-client";
import { type AdvanceState, advanceLabel, advancePendingLabel, canAdvance } from "./advance";

interface AdvanceControlProps {
  readonly lobby: LobbySnapshot | null;
  readonly round: RoundView;
  readonly advance: AdvanceState;
  readonly online: boolean;
  readonly onAdvance: () => void;
}

/** After a reveal, the Host opens the next Question or finishes the match after the last one. */
export function AdvanceControl({ lobby, round, advance, online, onAdvance }: AdvanceControlProps) {
  if (!canAdvance(lobby, round)) return null;

  return (
    <div>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#b84700] px-6 font-semibold text-white hover:bg-[#993a00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84700] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={!online || advance.pending}
        onClick={onAdvance}
        type="button"
      >
        {advance.pending ? advancePendingLabel(round) : advanceLabel(round)}
      </button>
      <div aria-live="assertive" className="mt-3 min-h-5">
        {advance.error ? (
          <p className="text-sm text-red-800" role="alert">
            {describeRoomError(advance.error)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
