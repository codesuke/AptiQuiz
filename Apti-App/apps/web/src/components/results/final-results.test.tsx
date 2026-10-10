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
  it("shows the podium, full standings, and the Participant's own metrics", () => {
    const html = renderToStaticMarkup(<FinalResults results={results} viewerId="d" />);
    expect(html).toContain("Top three");
    expect(html).toContain("Full leaderboard");
    expect(html).toContain("Your result");
    expect(html).toContain("Rank 4");
    expect(html).toContain("0/4 (0%)");
    expect(html).toContain("Average Effective Response Time");
    expect(html).toContain("Logic: 0/2 (0%)");
    for (const result of results) expect(html).toContain(result.displayName);
  });

  it("does not invent a Host result and keeps Finalizing results visible", () => {
    const host = renderToStaticMarkup(<FinalResults results={results} viewerId={null} />);
    expect(host).not.toContain("Your result");
    const finalizing = renderToStaticMarkup(<FinalResults results={undefined} viewerId={null} />);
    expect(finalizing).toContain("Finalizing results");
  });
});
