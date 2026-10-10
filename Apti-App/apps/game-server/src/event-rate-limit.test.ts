import { describe, expect, it } from "vitest";
import { createEventRateLimit } from "./event-rate-limit.js";

const POLICY = { burst: 3, refillPerSecond: 2 } as const;

describe("createEventRateLimit", () => {
  it("allows a burst of events up to the configured size", () => {
    const allow = createEventRateLimit(POLICY, () => 0);

    expect([allow(), allow(), allow()]).toEqual([true, true, true]);
  });

  it("refuses an event once the burst is spent and no time has passed", () => {
    const allow = createEventRateLimit(POLICY, () => 0);
    allow();
    allow();
    allow();

    expect(allow()).toBe(false);
  });

  it("allows events again as server time refills the budget", () => {
    let time = 0;
    const allow = createEventRateLimit(POLICY, () => time);
    allow();
    allow();
    allow();

    time = 500;

    expect(allow()).toBe(true);
    expect(allow()).toBe(false);
  });

  it("never refills beyond the burst size after a long quiet period", () => {
    let time = 0;
    const allow = createEventRateLimit(POLICY, () => time);

    time = 60_000;

    expect([allow(), allow(), allow(), allow()]).toEqual([true, true, true, false]);
  });
});
