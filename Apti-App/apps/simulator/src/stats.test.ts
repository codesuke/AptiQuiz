import { describe, expect, it } from "vitest";
import { LatencyRecorder, summarizeLatency } from "./stats.js";

describe("summarizeLatency", () => {
  it("reports sample count, p50, p95, and max from unsorted values", () => {
    const values = Array.from({ length: 100 }, (_, index) => 100 - index);
    expect(summarizeLatency(values)).toEqual({ samples: 100, p50: 50, p95: 95, max: 100 });
  });

  it("reports nulls for no samples", () => {
    expect(summarizeLatency([])).toEqual({ samples: 0, p50: null, p95: null, max: null });
  });
});

describe("LatencyRecorder", () => {
  it("keeps separate labelled metrics", () => {
    const recorder = new LatencyRecorder();
    recorder.record("a", 5);
    recorder.record("a", 15);
    recorder.record("b", 1);
    expect(recorder.summaries()).toEqual({
      a: { samples: 2, p50: 5, p95: 15, max: 15 },
      b: { samples: 1, p50: 1, p95: 1, max: 1 },
    });
  });
});
