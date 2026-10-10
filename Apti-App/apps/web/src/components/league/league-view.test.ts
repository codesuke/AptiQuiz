import { describe, expect, it } from "vitest";
import { collegesLabel, leaguePeriodLabel } from "./league-view";

describe("league view", () => {
  it("labels the Monday to Sunday UTC week", () => {
    const label = leaguePeriodLabel({
      start: new Date("2026-10-05T00:00:00Z"),
      end: new Date("2026-10-12T00:00:00Z"),
    });
    expect(label.replace(/ /g, " ")).toBe("Mon 5 Oct – Sun 11 Oct 2026 (UTC)");
  });

  it("ends on Sunday across a month and year boundary", () => {
    const label = leaguePeriodLabel({
      start: new Date("2026-12-28T00:00:00Z"),
      end: new Date("2027-01-04T00:00:00Z"),
    });
    expect(label).toBe("Mon 28 Dec – Sun 3 Jan 2027 (UTC)");
  });

  it("joins every captured College", () => {
    expect(collegesLabel(["A College", "B College"])).toBe("A College, B College");
  });
});
