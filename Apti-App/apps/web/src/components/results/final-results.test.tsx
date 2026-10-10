import type { FinalResult } from "@aptiquiz/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinalResults } from "./final-results";

const results: FinalResult[] = [
  {
    participantId: "a",
    displayName: "Asha",
    rank: 1,
    totalScore: 1800,
    correctAnswers: 2,
    totalQuestions: 4,
    averageResponseMs: 833,
    topics: [{ topic: "Math", correct: 2, total: 2 }],
  },
  {
    participantId: "b",
    displayName: "Ravi",
    rank: 2,
    totalScore: 900,
    correctAnswers: 1,
    totalQuestions: 4,
    averageResponseMs: 1200,
    topics: [{ topic: "Logic", correct: 1, total: 2 }],
  },
  {
    participantId: "c",
    displayName: "Hari",
    rank: 3,
    totalScore: 0,
    correctAnswers: 0,
    totalQuestions: 4,
    averageResponseMs: null,
    topics: [{ topic: "Math", correct: 0, total: 2 }],
  },
  {
    participantId: "d",
    displayName: "Gita",
    rank: 4,
    totalScore: 0,
    correctAnswers: 0,
    totalQuestions: 4,
    averageResponseMs: null,
    topics: [{ topic: "Logic", correct: 0, total: 2 }],
  },
];

describe("final results screen", () => {
  it("leads with a Participant's score, rank, and performance metrics", () => {
    const html = renderToStaticMarkup(<FinalResults results={results} viewerId="d" />);
    const ownResult = html.slice(html.indexOf("Your result"), html.indexOf("Top three"));

    expect(html).toContain("Top three");
    expect(html).toContain("Full leaderboard");
    expect(ownResult).toContain("Your result");
    expect(ownResult).toContain("Your rank");
    expect(ownResult).toContain(">4<");
    expect(ownResult).toContain("0 points");
    expect(ownResult).toContain("0/4 (0%)");
    expect(ownResult).toContain("Average Effective Response Time");
    expect(ownResult).toContain("Logic: 0/2 (0%)");
    for (const result of results) expect(html).toContain(result.displayName);
  });

  it("keeps the Leaderboard compact and gives Participants clear next actions", () => {
    const html = renderToStaticMarkup(<FinalResults results={results} viewerId="d" />);

    expect(html.match(/Average Effective Response Time/g)).toHaveLength(1);
    expect(html.match(/Logic: 0\/2 \(0%\)/g)).toHaveLength(1);
    expect(html).toContain("First place");
    expect(html).toContain("Second place");
    expect(html).toContain("Third place");
    expect(html).toContain("View College League");
    expect(html).toContain('href="/league"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-current="true"');
  });

  it("does not invent a Host result or Participant next actions and keeps Finalizing results visible", () => {
    const host = renderToStaticMarkup(<FinalResults results={results} viewerId={null} />);
    expect(host).not.toContain("Your result");
    expect(host).not.toContain('href="/league"');
    expect(host).not.toContain("Average Effective Response Time");
    const finalizing = renderToStaticMarkup(<FinalResults results={undefined} viewerId={null} />);
    expect(finalizing).toContain("Finalizing results");
  });

  it("keeps a Room-sized Leaderboard readable without repeating detailed metrics", () => {
    const resultTemplate = results.at(0);
    if (!resultTemplate) throw new Error("Result fixture is required.");
    const roomResults = Array.from({ length: 50 }, (_, index) => ({
      ...resultTemplate,
      participantId: `participant-${index + 1}`,
      displayName: `Participant ${index + 1}`,
      rank: index + 1,
      totalScore: 5_000 - index * 100,
    }));
    const html = renderToStaticMarkup(
      <FinalResults results={roomResults} viewerId="participant-50" />,
    );

    expect(html).toContain("Participant 1");
    expect(html).toContain("Participant 50");
    expect(html.match(/Average Effective Response Time/g)).toHaveLength(1);
  });

  it("keeps the actual server rank visible for a non-consecutive podium place", () => {
    const tiedRankResults = results.map((result) =>
      result.participantId === "c" ? { ...result, rank: 4 } : result,
    );
    const html = renderToStaticMarkup(<FinalResults results={tiedRankResults} viewerId="a" />);

    expect(html).toContain("Place 4");
  });
});
