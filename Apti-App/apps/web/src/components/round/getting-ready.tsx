"use client";

import type { LobbySnapshot } from "@aptiquiz/contracts";
import { useEffect, useState } from "react";
import { clockOffsetMs, displaySeconds, remainingMs } from "@/lib/server-clock";
import { LivePulse } from "./live-motion";

interface GettingReadyProps {
  readonly ready: NonNullable<LobbySnapshot["ready"]>;
  readonly receivedAt: number;
}

/** The server opens the Question; this timer only describes when that will happen. */
export function GettingReady({ ready, receivedAt }: GettingReadyProps) {
  const offsetMs = clockOffsetMs(ready.serverTime, receivedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = displaySeconds(remainingMs(ready.endsAt, offsetMs, now));

  return (
    <section
      aria-labelledby="getting-ready-heading"
      className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl bg-[var(--aq-ink)] px-6 py-12 text-center text-white sm:min-h-[34rem]"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aq-text-on-dark)]">
        Question {ready.questionIndex + 1}
      </p>
      <h2
        className="mt-5 font-[family-name:var(--aq-font-display)] text-4xl tracking-[-0.05em] sm:text-5xl"
        id="getting-ready-heading"
      >
        Getting ready
      </h2>
      <p className="mt-4 max-w-md text-[var(--aq-text-on-dark)]">
        The next Question opens for everyone when the countdown ends.
      </p>
      <p
        aria-label={`Question starts in ${seconds} seconds`}
        className="mt-9 font-mono text-[clamp(5rem,14vw,9rem)] font-bold leading-none tabular-nums text-white"
        role="timer"
      >
        <LivePulse key={seconds}>{seconds}</LivePulse>
      </p>
    </section>
  );
}
