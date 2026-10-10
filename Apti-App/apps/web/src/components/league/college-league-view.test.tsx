import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollegeLeagueView } from "./college-league-view";

const period = { start: new Date("2026-10-05T00:00:00Z"), end: new Date("2026-10-12T00:00:00Z") };

describe("CollegeLeagueView", () => {
  it("shows the UTC week and ranked rows with their Colleges", () => {
    const html = renderToStaticMarkup(
      <CollegeLeagueView
        league={{
          period,
          participants: [
            {
              rank: 1,
              userId: "u1",
              displayName: "Asha",
              totalScore: 1900,
              colleges: ["IIT A", "NIT B"],
            },
            { rank: 2, userId: "u2", displayName: "Ravi", totalScore: 0, colleges: ["IIT A"] },
          ],
          colleges: [],
        }}
      />,
    );
    expect(html).toContain("College League");
    expect(html).toMatch(/Mon 5 Oct\s–\sSun 11 Oct 2026 \(UTC\)/);
    expect(html).toContain("<caption");
    expect(html).toContain("IIT A, NIT B");
    expect(html).toMatch(/Asha[\s\S]*1900[\s\S]*Ravi[\s\S]*>0</);
    expect(html).not.toContain("No eligible results");
  });

  it("shows an empty state without a table", () => {
    const html = renderToStaticMarkup(
      <CollegeLeagueView league={{ period, participants: [], colleges: [] }} />,
    );
    expect(html).toContain("No eligible results yet this week.");
    expect(html).not.toContain("<table");
  });

  it("shows the College table with rank, name and score including zero", () => {
    const html = renderToStaticMarkup(
      <CollegeLeagueView
        league={{
          period,
          participants: [],
          colleges: [
            { rank: 1, collegeId: "c1", name: "IIT A", totalScore: 2400 },
            { rank: 2, collegeId: "c2", name: "NIT B", totalScore: 0 },
          ],
        }}
      />,
    );
    expect(html).toContain("Top Colleges this week by total score");
    expect(html).toContain('scope="col">College<');
    expect(html).toContain('scope="col">Total score<');
    expect(html).toMatch(/<td[^>]*>1<\/td><th[^>]*scope="row">IIT A<\/th><td[^>]*>2400</);
    expect(html).toMatch(/<td[^>]*>2<\/td><th[^>]*scope="row">NIT B<\/th><td[^>]*>0</);
    expect(html).not.toContain("No College has eligible results");
  });

  it("shows a College empty state without a College table", () => {
    const html = renderToStaticMarkup(
      <CollegeLeagueView
        league={{
          period,
          participants: [
            { rank: 1, userId: "u1", displayName: "Asha", totalScore: 10, colleges: ["IIT A"] },
          ],
          colleges: [],
        }}
      />,
    );
    expect(html).toContain("No College has eligible results yet this week.");
    expect(html).not.toContain("Top Colleges this week");
  });
});
