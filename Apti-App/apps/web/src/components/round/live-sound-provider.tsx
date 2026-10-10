"use client";

import type { LobbySnapshot } from "@aptiquiz/contracts";
import { Volume2, VolumeX } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { clockOffsetMs, displaySeconds, type ReceivedRound, remainingMs } from "@/lib/server-clock";
import { createLiveSoundController, type LiveCue } from "./live-sound";
import { soundEventsFor } from "./live-sound-events";

type SoundController = ReturnType<typeof createLiveSoundController>;
type EmitCue = (cue: LiveCue, eventId: string) => void;
const SoundContext = createContext<{
  readonly emit: EmitCue;
  readonly muted: boolean | null;
  readonly toggle: () => void;
}>({
  emit: () => {},
  muted: null,
  toggle: () => {},
});

export function LiveSoundProvider({ children }: { readonly children: ReactNode }) {
  const controller = useRef<SoundController | null>(null);
  const [muted, setMuted] = useState<boolean | null>(null);

  useEffect(() => {
    const preferences = {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
    };
    const played = {
      getItem: (key: string) => window.sessionStorage.getItem(key),
      setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
    };
    controller.current = createLiveSoundController(preferences, played, playCue, unlockAudio);
    setMuted(controller.current.isMuted());
    const interact = () => controller.current?.interact();
    window.addEventListener("pointerdown", interact, { once: true });
    window.addEventListener("keydown", interact, { once: true });
    return () => {
      window.removeEventListener("pointerdown", interact);
      window.removeEventListener("keydown", interact);
    };
  }, []);

  const emit = useCallback<EmitCue>((cue, eventId) => controller.current?.emit(cue, eventId), []);
  const toggle = useCallback(() => {
    if (!controller.current) return;
    const next = !controller.current.isMuted();
    if (!next) controller.current.interact();
    controller.current.setMuted(next);
    setMuted(next);
  }, []);

  return <SoundContext.Provider value={{ emit, muted, toggle }}>{children}</SoundContext.Provider>;
}

export function useLiveSound() {
  return useContext(SoundContext);
}

export function SoundToggle() {
  const { muted, toggle } = useLiveSound();
  return (
    <button
      aria-label={
        muted === null
          ? "Loading sound setting"
          : muted
            ? "Unmute live Room sounds"
            : "Mute live Room sounds"
      }
      aria-pressed={muted === null ? undefined : !muted}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--aq-rule)] bg-white px-3 py-2 text-sm font-semibold text-[var(--aq-ink)] transition-colors hover:border-[var(--aq-action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aq-action)]"
      onClick={toggle}
      disabled={muted === null}
      type="button"
    >
      {muted ? (
        <VolumeX aria-hidden="true" className="size-4" />
      ) : (
        <Volume2 aria-hidden="true" className="size-4" />
      )}
      Sound {muted === null ? "setting…" : muted ? "off" : "on"}
    </button>
  );
}

/** Reads server deadlines; the sound controller deduplicates every cue key. */
export function useLiveSoundCues(
  lobby: LobbySnapshot | null,
  round: ReceivedRound | null,
  lobbyReceivedAt: number,
) {
  const { emit } = useLiveSound();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (lobby?.phase === "FINISHED" || lobby?.phase === "FINALIZING_RESULTS") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [lobby?.phase]);

  useEffect(() => {
    if (!lobby) return;
    if (lobby.phase === "FINISHED") {
      for (const event of soundEventsFor({ roomId: lobby.roomId, phase: "FINISHED" }))
        emit(event.cue, event.key);
      return;
    }
    if (lobby.phase === "GETTING_READY" && lobby.ready) {
      const ready = lobby.ready;
      const secondsLeft = displaySeconds(
        remainingMs(ready.endsAt, clockOffsetMs(ready.serverTime, lobbyReceivedAt), now),
      );
      for (const event of soundEventsFor({
        roomId: lobby.roomId,
        phase: "GETTING_READY",
        questionIndex: ready.questionIndex,
        deadline: ready.endsAt,
        secondsLeft,
      }))
        emit(event.cue, event.key);
      return;
    }
    if (!round) return;
    const view = round.view;
    const deadline = view.phase === "QUESTION_REVEAL" ? view.revealEndsAt : view.endsAt;
    const secondsLeft = displaySeconds(remainingMs(deadline, round.clockOffsetMs, now));
    const correct = view.phase === "QUESTION_REVEAL" ? view.result?.correct : undefined;
    for (const event of soundEventsFor({
      roomId: lobby.roomId,
      phase: view.phase,
      questionIndex: view.questionIndex,
      deadline,
      secondsLeft,
      correct,
    }))
      emit(event.cue, event.key);
  });
}

let audioContext: AudioContext | null = null;

function unlockAudio(): void {
  if (typeof AudioContext === "undefined") return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});
}

function playCue(cue: LiveCue): void {
  const context = audioContext;
  if (context === null) return;
  const notes =
    cue === "finish"
      ? [523, 659, 784]
      : cue === "correct"
        ? [784, 1046]
        : cue === "lock"
          ? [660, 880]
          : cue === "reveal"
            ? [523, 659]
            : [660];
  const length = cue === "tick" ? 0.065 : 0.11;
  for (const [index, frequency] of notes.entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startsAt = context.currentTime + index * 0.09;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(0.045, startsAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + length);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
