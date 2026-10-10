"use client";

import type { LobbySnapshot, RoundView } from "@aptiquiz/contracts";
import { describeRoomError } from "@/lib/rooms-client";
import {
  type AdvanceState,
  advanceLabel,
  advancePendingLabel,
  advancePrompt,
  canAdvance,
} from "./advance";

interface AdvanceControlProps {
  readonly lobby: LobbySnapshot | null;
  readonly round: RoundView;
  readonly advance: AdvanceState;
  readonly online: boolean;
  readonly onAdvance: () => void;
}

/** After a reveal, the Host opens the next Question or finishes the match after the last one. */
export function AdvanceControl({ lobby, round, advance, online, onAdvance }: AdvanceControlProps) {
  const ready = canAdvance(lobby, round);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[var(--aq-rule)] bg-[var(--aq-surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.04em] text-[var(--aq-ink)]">
          Ready for what’s next?
        </h2>
        <p className="mt-1 text-sm text-[var(--aq-text-muted)]">{advancePrompt(round)}</p>
      </div>
      <div className="shrink-0">
        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--aq-action-prominent)] px-6 font-semibold text-white hover:bg-[var(--aq-action-prominent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={!ready || !online || advance.pending}
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
    </section>
  );
}
