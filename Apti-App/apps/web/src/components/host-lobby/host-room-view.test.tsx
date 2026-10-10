import type { LobbySnapshot, RevealedRound, RoundView } from "@aptiquiz/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostRoomView, type HostRoomViewProps } from "./host-room-view";

const JOIN_LINK = "https://aptiquiz.example/join/ABC234";
const CLOSED_MESSAGE = "Match in progress — joining is closed.";

const participants = Array.from({ length: 12 }, (_, index) => ({
  participantId: `p-${index + 1}`,
  displayName: `Player ${index + 1}`,
  isGuest: index % 2 === 0,
}));

const lobby: LobbySnapshot = {
  roomId: "room-1",
  joinCode: "ABC234",
  phase: "LOBBY",
  college: { id: "college-1", name: "Test College" },
  questionSetTitle: "Starter set",
  questionCount: 4,
  participants,
  rules: {
    roundDurationMs: 30_000,
    maxDelayCompensationMs: 100,
    scoreBucketMs: 100,
  },
};

const question = {
  text: "Which number completes 2, 4, 8, ?",
  options: [
    { id: "o-1", text: "12" },
    { id: "o-2", text: "16" },
  ],
  topic: "Series",
  difficulty: "EASY" as const,
};

const open: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 0,
  questionCount: 4,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_000,
  question,
  answer: null,
};

const revealed: RevealedRound = {
  ...open,
  phase: "QUESTION_REVEAL",
  serverTime: 31_000,
  closedAt: 31_000,
  revealEndsAt: 37_000,
  correctOptionId: "o-2",
  result: null,
  scores: [
    { participantId: "p-1", displayName: "Player 1", answered: true, correct: true, points: 900 },
  ],
  leaderboard: [
    { participantId: "p-1", displayName: "Player 1", rank: 1, totalScore: 900, movement: null },
  ],
};

function render(overrides: Partial<HostRoomViewProps>) {
  const props: HostRoomViewProps = {
    lobby,
    lobbyReceivedAt: 1_000,
    round: null,
    connection: "online",
    roomError: null,
    registrationFailed: false,
    start: { pending: false, error: null },
    onStart: () => {},
    joinCode: "ABC234",
    joinLink: JOIN_LINK,
    collegeName: "Test College",
    questionSetTitle: "Starter set",
    ...overrides,
  };
  return renderToStaticMarkup(<HostRoomView {...props} />);
}

function positionOf(html: string, text: string) {
  const index = html.indexOf(text);
  expect(index, `expected "${text}" in the Host view`).toBeGreaterThan(-1);
  return index;
}

afterEach(() => vi.restoreAllMocks());

describe("Host live Room view", () => {
  it("places the Getting ready stage above the Room details and the Participant roster", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const html = render({
      lobby: {
        ...lobby,
        phase: "GETTING_READY",
        ready: { questionIndex: 0, serverTime: 1_000, endsAt: 4_000 },
      },
    });

    expect(positionOf(html, "Getting ready")).toBeLessThan(positionOf(html, CLOSED_MESSAGE));
    expect(positionOf(html, CLOSED_MESSAGE)).toBeLessThan(
      positionOf(html, 'aria-label="Participant roster"'),
    );
    expect(html).not.toContain(">Leaderboard<");
  });

  it("keeps the open Question first and shows the active Room details with QR code and Join Code", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round: { view: open, clockOffsetMs: 0 },
    });
    const details = html.slice(positionOf(html, 'aria-labelledby="active-room-details-heading"'));

    expect(positionOf(html, question.text)).toBeLessThan(positionOf(html, CLOSED_MESSAGE));
    expect(details).toContain(CLOSED_MESSAGE);
    expect(details).toContain(`QR code for the join link ${JOIN_LINK}`);
    expect(details).toContain("ABC234");
    expect(html).not.toContain(">Correct answer<");
    expect(html).not.toContain(">Leaderboard<");
    expect(html).not.toContain("Copy link");
  });

  it("orders a reveal as Question, cumulative Leaderboard, then the utility row", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_REVEAL" },
      round: { view: revealed, clockOffsetMs: 0 },
    });

    const questionAt = positionOf(html, question.text);
    const leaderboardAt = positionOf(html, ">Leaderboard<");
    const detailsAt = positionOf(html, CLOSED_MESSAGE);
    const rosterAt = positionOf(html, 'aria-label="Participant roster"');
    expect(questionAt).toBeLessThan(leaderboardAt);
    expect(leaderboardAt).toBeLessThan(detailsAt);
    expect(detailsAt).toBeLessThan(rosterAt);
    expect(html).toContain(">Correct answer<");
  });

  it("highlights the fastest correct Participant by server time and shows Round points beside totals", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const view: RevealedRound = {
      ...revealed,
      questionIndex: 1,
      scores: [
        {
          participantId: "p-1",
          displayName: "Player 1",
          answered: true,
          correct: true,
          points: 780,
          effectiveResponseMs: 6_600,
        },
        {
          participantId: "p-2",
          displayName: "Player 2",
          answered: true,
          correct: true,
          points: 960,
          effectiveResponseMs: 1_200,
        },
        {
          participantId: "p-3",
          displayName: "Player 3",
          answered: true,
          correct: false,
          points: 0,
          effectiveResponseMs: 400,
        },
      ],
      leaderboard: [
        { participantId: "p-1", displayName: "Player 1", rank: 1, totalScore: 1_680, movement: 0 },
        { participantId: "p-3", displayName: "Player 3", rank: 2, totalScore: 990, movement: -1 },
        { participantId: "p-2", displayName: "Player 2", rank: 3, totalScore: 960, movement: 0 },
      ],
    };
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_REVEAL" },
      round: { view, clockOffsetMs: 0 },
    });
    const standings = html.slice(positionOf(html, "Standings after Question 2"));

    expect(standings).toContain("Fastest correct");
    expect(standings).toContain("Player 2");
    expect(standings).toContain("1.2 s");
    expect(standings).toContain("2 of 3 players answered correctly");
    expect(standings).not.toContain("No correct answers this Round");
    expect(positionOf(standings, "Fastest correct")).toBeLessThan(
      positionOf(standings, ">Leaderboard<"),
    );

    const board = standings.slice(positionOf(standings, ">Leaderboard<"));
    // Server order is kept even though Player 2 earned the most points this Round.
    expect(positionOf(board, "Player 1")).toBeLessThan(positionOf(board, "Player 3"));
    expect(positionOf(board, "Player 3")).toBeLessThan(positionOf(board, "Player 2"));
    expect(board).toContain("+780");
    expect(board).toContain("+0");
    expect(board).toContain("+960");
    expect(positionOf(board, "+780")).toBeLessThan(positionOf(board, "1680"));
  });

  it("shows an honest no-winner state when no Participant is correct", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const view: RevealedRound = {
      ...revealed,
      scores: [
        {
          participantId: "p-1",
          displayName: "Player 1",
          answered: true,
          correct: false,
          points: 0,
          effectiveResponseMs: 800,
        },
        {
          participantId: "p-2",
          displayName: "Player 2",
          answered: false,
          correct: false,
          points: 0,
          effectiveResponseMs: null,
        },
      ],
      leaderboard: [
        { participantId: "p-1", displayName: "Player 1", rank: 1, totalScore: 0, movement: null },
        { participantId: "p-2", displayName: "Player 2", rank: 2, totalScore: 0, movement: null },
      ],
    };
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_REVEAL" },
      round: { view, clockOffsetMs: 0 },
    });

    expect(html).toContain("No correct answers this Round");
    expect(html).toContain("0 of 2 players answered correctly");
    expect(html).not.toContain("Fastest correct");
  });

  it("shows only the correct count when correct Answers carry no server time", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const view: RevealedRound = {
      ...revealed,
      scores: [
        {
          participantId: "p-1",
          displayName: "Player 1",
          answered: true,
          correct: true,
          points: 700,
          effectiveResponseMs: null,
        },
        {
          participantId: "p-2",
          displayName: "Player 2",
          answered: false,
          correct: false,
          points: 0,
          effectiveResponseMs: null,
        },
      ],
    };
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_REVEAL" },
      round: { view, clockOffsetMs: 0 },
    });

    expect(html).toContain("1 of 2 players answered correctly");
    expect(html).not.toContain("No correct answers this Round");
    expect(html).not.toContain("Fastest correct");
  });

  it("keeps the Participant count and a focusable, labelled scroll region for the full roster", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round: { view: open, clockOffsetMs: 0 },
    });
    const roster = html.slice(positionOf(html, 'aria-label="Participant roster"'));

    expect(html).toContain("12 / 50");
    // A labelled section is a region landmark; tabindex lets keyboard users scroll it.
    expect(html).toMatch(/<section aria-label="Participant roster"[^>]*tabindex="0"/);
    for (const participant of participants) expect(roster).toContain(participant.displayName);
    expect(roster).toContain("Scroll to see all 12 players");
  });

  it("keeps the Lobby sharing treatment without the active-match panel", () => {
    const html = render({});

    expect(html).toContain("Invite players");
    expect(html).toContain("Copy link");
    expect(html).toContain("Start match");
    expect(html).not.toContain(CLOSED_MESSAGE);
  });

  it("omits the active-match QR panel from completed Results", () => {
    const html = render({
      lobby: {
        ...lobby,
        phase: "FINISHED",
        results: [
          {
            participantId: "p-1",
            displayName: "Player 1",
            rank: 1,
            totalScore: 900,
            correctAnswers: 1,
            totalQuestions: 4,
            averageResponseMs: 800,
            topics: [],
          },
        ],
      },
    });

    expect(html).toContain("Player 1");
    expect(html).not.toContain(CLOSED_MESSAGE);
    expect(html).not.toContain("QR code for the join link");
  });
});
