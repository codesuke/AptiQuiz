import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCollegeLeague = vi.hoisted(() => vi.fn());

vi.mock("@aptiquiz/database", () => ({ getCollegeLeague }));
vi.mock("@/lib/database", () => ({ database: { name: "test-database" } }));

import LeaguePage, { dynamic } from "./page";

const league = {
  period: {
    start: new Date("2026-10-05T00:00:00.000Z"),
    end: new Date("2026-10-12T00:00:00.000Z"),
  },
  participants: [],
  colleges: [],
};

describe("the public League page", () => {
  beforeEach(() => {
    getCollegeLeague.mockReset();
    getCollegeLeague.mockResolvedValue(league);
  });

  it("renders without a session and reads the League for the time of the request", async () => {
    const before = Date.now();
    const markup = renderToStaticMarkup(await LeaguePage());

    const [, requestedAt] = getCollegeLeague.mock.calls[0] ?? [];
    expect(requestedAt).toBeInstanceOf(Date);
    expect(requestedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(markup).toContain("Mon 5 Oct – Sun 11 Oct 2026 (UTC)");
    expect(markup).toContain("No eligible results yet this week.");
    expect(markup).toContain("No College has eligible results yet this week.");
  });

  it("is rendered on every request so a refresh shows newly saved results", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
