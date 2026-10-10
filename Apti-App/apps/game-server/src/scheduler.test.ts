import { describe, expect, it } from "vitest";
import { createTimerScheduler } from "./scheduler.js";

const DELAY_MS = 20;
const WAIT_MS = 80;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("createTimerScheduler", () => {
  it("runs a callback once the server clock reaches the requested time", async () => {
    const schedule = createTimerScheduler(Date.now);
    const ran: number[] = [];

    schedule(Date.now() + DELAY_MS, () => ran.push(Date.now()));
    await wait(WAIT_MS);

    expect(ran).toHaveLength(1);
  });

  it("runs a callback for a time already passed without waiting for it", async () => {
    const schedule = createTimerScheduler(() => 10_000);
    let ran = false;

    schedule(5_000, () => {
      ran = true;
    });
    await wait(0);

    expect(ran).toBe(true);
  });

  it("does not run a cancelled callback", async () => {
    const schedule = createTimerScheduler(Date.now);
    let ran = false;

    const cancel = schedule(Date.now() + DELAY_MS, () => {
      ran = true;
    });
    cancel();
    await wait(WAIT_MS);

    expect(ran).toBe(false);
  });
});
