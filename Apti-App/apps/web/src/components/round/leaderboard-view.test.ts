import { describe, expect, it } from "vitest";
import { isOwnRow, movementView } from "./leaderboard-view";

describe("movementView", () => {
  it("shows a neutral dash after the first Round", () => {
    expect(movementView(null)).toEqual({ text: "—", ariaLabel: "No previous rank" });
  });

  it("shows climbs, drops, and no change as text", () => {
    expect(movementView(2)).toEqual({ text: "▲ 2", ariaLabel: "Up 2 places" });
    expect(movementView(1)).toEqual({ text: "▲ 1", ariaLabel: "Up 1 place" });
    expect(movementView(-3)).toEqual({ text: "▼ 3", ariaLabel: "Down 3 places" });
    expect(movementView(0)).toEqual({ text: "=", ariaLabel: "Rank unchanged" });
  });
});

describe("isOwnRow", () => {
  it("matches only the viewer's Participant id", () => {
    expect(isOwnRow({ participantId: "p-1" }, "p-1")).toBe(true);
    expect(isOwnRow({ participantId: "p-1" }, "p-2")).toBe(false);
  });

  it("matches nothing for the Host", () => {
    expect(isOwnRow({ participantId: "p-1" }, null)).toBe(false);
  });
});
