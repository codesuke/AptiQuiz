import { describe, expect, it, vi } from "vitest";
import { createLiveSoundController } from "./live-sound";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("live sound", () => {
  it("waits for interaction, then plays each Room event only once", () => {
    const output = vi.fn();
    const preferences = memoryStore();
    const played = memoryStore();
    const unlock = vi.fn();
    const sound = createLiveSoundController(preferences, played, output, unlock);
    sound.emit("tick", "room-a:q0:3");
    expect(output).not.toHaveBeenCalled();
    sound.interact();
    sound.emit("tick", "room-a:q0:3");
    sound.emit("tick", "room-a:q0:2");
    sound.emit("tick", "room-a:q0:2");
    expect(output).toHaveBeenCalledTimes(1);
    expect(unlock).toHaveBeenCalledTimes(1);
    createLiveSoundController(preferences, played, output).interact();
    const reconnected = createLiveSoundController(preferences, played, output);
    reconnected.interact();
    reconnected.emit("tick", "room-a:q0:3");
    expect(output).toHaveBeenCalledTimes(1);
  });

  it("remembers mute and keeps audio failure from interrupting the Room", () => {
    const preferences = memoryStore();
    const played = memoryStore();
    const failingOutput = vi.fn(() => {
      throw new Error("audio unavailable");
    });
    const sound = createLiveSoundController(preferences, played, failingOutput);
    sound.interact();
    sound.setMuted(true);
    sound.emit("reveal", "room-a:q0:reveal");
    expect(failingOutput).not.toHaveBeenCalled();
    const refreshed = createLiveSoundController(preferences, played, failingOutput);
    expect(refreshed.isMuted()).toBe(true);
    refreshed.interact();
    refreshed.setMuted(false);
    refreshed.emit("reveal", "room-a:q0:reveal");
    expect(failingOutput).not.toHaveBeenCalled();
    expect(() => refreshed.emit("correct", "room-a:q0:correct")).not.toThrow();
    expect(failingOutput).toHaveBeenCalledTimes(1);
  });
});
