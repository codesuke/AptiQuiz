"use client";

import { useEffect, useState } from "react";
import { displaySeconds, type ReceivedRound, remainingMs } from "@/lib/server-clock";

const TICK_MS = 250;

/** Whole seconds left in the Round by server time, refreshed a few times each second. */
export function useCountdown(round: ReceivedRound): number {
  const { clockOffsetMs } = round;
  const { endsAt } = round.view;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return displaySeconds(remainingMs(endsAt, clockOffsetMs, now));
}
