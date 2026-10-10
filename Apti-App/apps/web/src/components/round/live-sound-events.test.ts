import { describe, expect, it } from "vitest";
import { soundEventsFor } from "./live-sound-events";

describe("live Room sound events", () => {
  it("maps the final three seconds, reveal, and finish to stable cue keys", () => {
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "QUESTION_OPEN",
        questionIndex: 0,
        deadline: 30_000,
        secondsLeft: 4,
      }),
    ).toEqual([]);
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "QUESTION_OPEN",
        questionIndex: 0,
        deadline: 30_000,
        secondsLeft: 3,
      }),
    ).toEqual([{ cue: "tick", key: "r:QUESTION_OPEN:0:30000:3" }]);
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "GETTING_READY",
        questionIndex: 1,
        deadline: 39_000,
        secondsLeft: 2,
      }),
    ).toEqual([{ cue: "tick", key: "r:GETTING_READY:1:39000:2" }]);
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "QUESTION_REVEAL",
        questionIndex: 0,
        deadline: 36_000,
        secondsLeft: 6,
        correct: true,
      }),
    ).toEqual([{ cue: "correct", key: "r:QUESTION_REVEAL:0:36000:reveal" }]);
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "QUESTION_REVEAL",
        questionIndex: 0,
        deadline: 36_000,
        secondsLeft: 1,
      }),
    ).toEqual([
      { cue: "reveal", key: "r:QUESTION_REVEAL:0:36000:reveal" },
      { cue: "tick", key: "r:QUESTION_REVEAL:0:36000:1" },
    ]);
    expect(
      soundEventsFor({
        roomId: "r",
        phase: "QUESTION_OPEN",
        questionIndex: 0,
        deadline: 30_000,
        secondsLeft: 4,
        correct: true,
      }),
    ).toEqual([]);
    expect(soundEventsFor({ roomId: "r", phase: "FINISHED" })).toEqual([
      { cue: "finish", key: "r:FINISHED" },
    ]);
  });
});
