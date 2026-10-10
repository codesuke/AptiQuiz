import type { RevealedRound, RoundView } from "@aptiquiz/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParticipantRound } from "./participant-round";

const VIEWER = "p-2";

const question = {
  text: "Which number completes 2, 4, 8, ?",
  options: [
    { id: "x-1", text: "12" },
    { id: "x-2", text: "16" },
  ],
  topic: "Series",
  difficulty: "EASY" as const,
};

const open: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 1,
  questionCount: 4,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_000,
  question,
  answer: { questionIndex: 1, optionId: "x-2", receivedAt: 2_200 },
};

const revealed: RevealedRound = {
  ...open,
  phase: "QUESTION_REVEAL",
  serverTime: 31_000,
  closedAt: 31_000,
  revealEndsAt: 37_000,
  correctOptionId: "x-2",
  result: { correct: true, points: 960 },
  scores: [
    {
      participantId: "p-1",
      displayName: "Asha",
      answered: true,
      correct: true,
      points: 780,
      effectiveResponseMs: 6_600,
    },
    {
      participantId: "p-2",
      displayName: "Ravi",
      answered: true,
      correct: true,
      points: 960,
      effectiveResponseMs: 1_200,
    },
    {
      participantId: "p-3",
      displayName: "Meera",
      answered: true,
      correct: false,
      points: 0,
      effectiveResponseMs: 400,
    },
  ],
  leaderboard: [
    { participantId: "p-1", displayName: "Asha", rank: 1, totalScore: 1_680, movement: 0 },
    { participantId: "p-2", displayName: "Ravi", rank: 2, totalScore: 1_460, movement: 1 },
    { participantId: "p-3", displayName: "Meera", rank: 3, totalScore: 990, movement: -1 },
  ],
};

function render(view: RoundView) {
  return renderToStaticMarkup(
    <ParticipantRound
      online
      participantId={VIEWER}
      round={{ view, clockOffsetMs: 0 }}
      sendAnswer={() => {}}
    />,
  );
}

function positionOf(html: string, text: string) {
  const index = html.indexOf(text);
  expect(index, `expected "${text}" in the Participant view`).toBeGreaterThan(-1);
  return index;
}

afterEach(() => vi.restoreAllMocks());

describe("Participant revealed Round", () => {
  it("leads with the personal result, then shared highlights, then the Leaderboard", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render(revealed);
    const personalAt = positionOf(html, 'aria-label="Your Round result"');
    const optionsAt = positionOf(html, "Correct answer");
    const highlightsAt = positionOf(html, "Fastest correct");
    const leaderboardAt = positionOf(html, ">Leaderboard<");

    expect(personalAt).toBeLessThan(optionsAt);
    expect(optionsAt).toBeLessThan(highlightsAt);
    expect(highlightsAt).toBeLessThan(leaderboardAt);

    const personal = html.slice(personalAt, optionsAt);
    expect(personal).toContain("Correct");
    expect(personal).toContain("+960");
    expect(personal).toContain("#2");
    expect(personal).toContain("of 3");
    expect(personal).toContain("Up 1 place");
  });

  it("names the fastest correct Participant by server time and counts correct answers", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render(revealed);
    const highlights = html.slice(
      positionOf(html, "Fastest correct"),
      positionOf(html, ">Leaderboard<"),
    );

    expect(highlights).toContain("Ravi");
    expect(highlights).toContain("1.2 s");
    expect(highlights).toContain("2 of 3 players answered correctly");
    expect(highlights).not.toContain("No correct answers this Round");
  });

  it("keeps server Leaderboard order and shows each row's Round points beside the total", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render(revealed);
    const board = html.slice(positionOf(html, ">Leaderboard<"));

    expect(positionOf(board, "Asha")).toBeLessThan(positionOf(board, "Ravi"));
    expect(positionOf(board, "Ravi")).toBeLessThan(positionOf(board, "Meera"));
    expect(positionOf(board, "+780")).toBeLessThan(positionOf(board, "1680"));
    expect(positionOf(board, "+960")).toBeLessThan(positionOf(board, "1460"));
    expect(positionOf(board, "+0")).toBeLessThan(positionOf(board, "990"));
    expect(board).toContain('aria-current="true"');
  });

  it("shows a wrong Answer with zero points and a downward move", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render({
      ...revealed,
      answer: { questionIndex: 1, optionId: "x-1", receivedAt: 2_200 },
      result: { correct: false, points: 0 },
      leaderboard: [
        { participantId: "p-1", displayName: "Asha", rank: 1, totalScore: 1_680, movement: 1 },
        { participantId: "p-3", displayName: "Meera", rank: 2, totalScore: 990, movement: 1 },
        { participantId: "p-2", displayName: "Ravi", rank: 3, totalScore: 500, movement: -2 },
      ],
    });
    const personal = html.slice(
      positionOf(html, 'aria-label="Your Round result"'),
      positionOf(html, "Correct answer"),
    );

    expect(personal).toContain("Wrong");
    expect(personal).toContain("+0");
    expect(personal).toContain("#3");
    expect(personal).toContain("Down 2 places");
  });

  it("shows No answer and the first standings without a movement", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render({
      ...revealed,
      questionIndex: 0,
      answer: null,
      result: { correct: false, points: 0 },
      leaderboard: revealed.leaderboard.map((entry) => ({ ...entry, movement: null })),
    });
    const personal = html.slice(
      positionOf(html, 'aria-label="Your Round result"'),
      positionOf(html, "Correct answer"),
    );

    expect(personal).toContain("No answer");
    expect(personal).toContain("No previous rank");
  });

  it("says no Participant was correct and names no fastest winner", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render({
      ...revealed,
      result: { correct: false, points: 0 },
      scores: revealed.scores.map((score) => ({ ...score, correct: false, points: 0 })),
    });

    expect(html).toContain("No correct answers this Round");
    expect(html).toContain("0 of 3 players answered correctly");
    expect(html).not.toContain("Fastest correct");
    expect(positionOf(html, "No correct answers this Round")).toBeLessThan(
      positionOf(html, ">Leaderboard<"),
    );
  });

  it("shows no result, timing, or standings while the Question is open", () => {
    vi.spyOn(Date, "now").mockReturnValue(5_000);
    const html = render(open);

    expect(html).toContain(question.text);
    expect(html).not.toContain("Your Round result");
    expect(html).not.toContain("Leaderboard");
    expect(html).not.toContain("Fastest correct");
    expect(html).not.toContain("answered correctly");
    expect(html).not.toContain("Correct answer");
    expect(html).not.toMatch(/\+\d/);
    expect(html).not.toMatch(/#\d/);
  });
});
