export type LiveCue = "tick" | "lock" | "reveal" | "correct" | "finish";

interface SoundStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MUTE_KEY = "aptiquiz:live-sound-muted";
const PLAYED_KEY = "aptiquiz:live-sound-played";
const MAX_PLAYED_EVENTS = 400;

function read(store: SoundStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function write(store: SoundStore, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* Storage may be unavailable in private mode. */
  }
}

/** One controller per Room view; session storage prevents replay after refresh or reconnect. */
export function createLiveSoundController(
  preferences: SoundStore,
  playedStore: SoundStore,
  output: (cue: LiveCue) => void,
  unlock: () => void = () => {},
) {
  let interacted = false;
  let muted = read(preferences, MUTE_KEY) === "true";
  let played: string[] = [];
  try {
    const stored = JSON.parse(read(playedStore, PLAYED_KEY) ?? "[]");
    if (Array.isArray(stored))
      played = stored
        .filter((item): item is string => typeof item === "string")
        .slice(-MAX_PLAYED_EVENTS);
  } catch {
    /* A damaged value only resets cue history. */
  }
  const seen = new Set(played);

  return {
    interact: () => {
      interacted = true;
      try {
        unlock();
      } catch {
        /* Audio activation is optional. */
      }
    },
    isMuted: () => muted,
    setMuted: (next: boolean) => {
      muted = next;
      write(preferences, MUTE_KEY, String(next));
    },
    emit: (cue: LiveCue, eventId: string) => {
      if (seen.has(eventId)) return;
      seen.add(eventId);
      played.push(eventId);
      if (played.length > MAX_PLAYED_EVENTS) played = played.slice(-MAX_PLAYED_EVENTS);
      write(playedStore, PLAYED_KEY, JSON.stringify(played));
      if (!interacted || muted) return;
      try {
        output(cue);
      } catch {
        /* Sound must never interrupt play. */
      }
    },
  };
}
