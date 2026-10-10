/** Stops a scheduled callback; calling it after the callback ran has no effect. */
export type CancelScheduled = () => void;

/** Runs `callback` once the server clock reaches `atServerTime`. */
export type Schedule = (atServerTime: number, callback: () => void) => CancelScheduled;

/** Production scheduler: a timer measured against the injected server clock. */
export function createTimerScheduler(now: () => number): Schedule {
  return (atServerTime, callback) => {
    const timer = setTimeout(callback, Math.max(0, atServerTime - now()));
    return () => clearTimeout(timer);
  };
}
