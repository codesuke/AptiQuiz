import type { RoundView } from "@aptiquiz/contracts";

/** A Round view with the browser-to-server clock offset measured when it arrived. */
export interface ReceivedRound {
  readonly view: RoundView;
  readonly clockOffsetMs: number;
}

const MS_PER_SECOND = 1000;

/** How far the server clock is ahead of this browser, from one server timestamp. */
export function clockOffsetMs(serverTime: number, receivedAt: number): number {
  return serverTime - receivedAt;
}

/** Records a Round view with the offset of the browser clock at the moment it arrived. */
export function receiveRound(view: RoundView, receivedAt: number): ReceivedRound {
  return { view, clockOffsetMs: clockOffsetMs(view.serverTime, receivedAt) };
}

/**
 * Milliseconds until the server deadline, never below zero. The browser clock is moved onto
 * server time first, so a wrong local clock does not change the displayed countdown.
 */
export function remainingMs(endsAt: number, offsetMs: number, now: number): number {
  const serverNow = now + offsetMs;
  return Math.max(0, endsAt - serverNow);
}

/** Whole seconds to show; a partial second still counts so "0" appears only at the deadline. */
export function displaySeconds(ms: number): number {
  return Math.ceil(ms / MS_PER_SECOND);
}
