import type { LobbySnapshot, RevealedRound, RoundView } from "@aptiquiz/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParticipantRoomView, type ParticipantRoomViewProps } from "./participant-room-view";

const ROOM_DETAILS = 'aria-labelledby="participant-room-details-heading"';
const ROSTER = 'aria-label="Participant roster"';

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
  result: { correct: true, points: 900 },
  scores: [
    {
      participantId: "p-1",
      displayName: "Player 1",
      answered: true,
      correct: true,
      points: 900,
      effectiveResponseMs: 3_000,
    },
  ],
  leaderboard: [
    { participantId: "p-1", displayName: "Player 1", rank: 1, totalScore: 900, movement: null },
  ],
};

function render(overrides: Partial<ParticipantRoomViewProps>) {
  const props: ParticipantRoomViewProps = {
    participant: participants[0] ?? { participantId: "p-1", displayName: "P", isGuest: true },
    lobby,
    lobbyReceivedAt: 1_000,
    round: null,
    score: 0,
    connection: "online",
    error: null,
    sendAnswer: () => {},
    ...overrides,
  };
  return renderToStaticMarkup(<ParticipantRoomView {...props} />);
}

function positionOf(html: string, text: string) {
  const index = html.indexOf(text);
  expect(index, `expected "${text}" in the Participant view`).toBeGreaterThan(-1);
  return index;
}

function expectNoHostUtilities(html: string) {
  expect(html).not.toContain("QR code");
  expect(html).not.toContain("Copy link");
  expect(html).not.toContain("Share");
  expect(html).not.toContain("Start match");
  expect(html).not.toContain("Invite players");
}

afterEach(() => vi.restoreAllMocks());

describe("Participant live Room view", () => {
  it("places Getting ready above the Room details and then the Participant roster", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const html = render({
      lobby: {
        ...lobby,
        phase: "GETTING_READY",
        ready: { questionIndex: 0, serverTime: 1_000, endsAt: 4_000 },
      },
    });

    expect(positionOf(html, "Getting ready")).toBeLessThan(positionOf(html, ROOM_DETAILS));
    expect(positionOf(html, ROOM_DETAILS)).toBeLessThan(positionOf(html, ROSTER));
    expectNoHostUtilities(html);
  });

  it("keeps the open Question and its answer buttons first without revealing correctness", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round: { view: open, clockOffsetMs: 0 },
    });

    const questionAt = positionOf(html, question.text);
    expect(questionAt).toBeLessThan(positionOf(html, ">16</button>"));
    expect(positionOf(html, ">16</button>")).toBeLessThan(positionOf(html, ROOM_DETAILS));
    expect(positionOf(html, ROOM_DETAILS)).toBeLessThan(positionOf(html, ROSTER));
    expect(html).not.toContain(">Correct answer<");
    expect(html).not.toContain(">Leaderboard<");
    expect(html).not.toContain("+900");
    expectNoHostUtilities(html);
  });

  it("keeps the revealed Round above the Room details and roster", () => {
    vi.spyOn(Date, "now").mockReturnValue(32_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_REVEAL" },
      round: { view: revealed, clockOffsetMs: 0 },
      score: 900,
    });

    expect(positionOf(html, question.text)).toBeLessThan(positionOf(html, ">Leaderboard<"));
    expect(positionOf(html, ">Leaderboard<")).toBeLessThan(positionOf(html, ROOM_DETAILS));
    expect(positionOf(html, ROOM_DETAILS)).toBeLessThan(positionOf(html, ROSTER));
    expectNoHostUtilities(html);
  });

  it("shows the Room facts and scoring rule in the details below the quiz", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round: { view: open, clockOffsetMs: 0 },
    });
    const details = html.slice(positionOf(html, ROOM_DETAILS), positionOf(html, ROSTER));

    expect(details).toContain("Test College");
    expect(details).toContain("ABC234");
    expect(details).toContain("4 Questions");
    expect(details).toContain("Scoring");
  });

  it("keeps the Participant count and a focusable, labelled scroll region for the full roster", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const html = render({
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round: { view: open, clockOffsetMs: 0 },
    });
    const roster = html.slice(positionOf(html, ROSTER));

    expect(html).toContain("12 / 50");
    // A labelled section is a region landmark; tabindex lets keyboard users scroll it.
    expect(html).toMatch(/<section aria-label="Participant roster"[^>]*tabindex="0"/);
    for (const participant of participants) expect(roster).toContain(participant.displayName);
    expect(roster).toContain("Scroll to see all 12 players");
  });

  it("puts the waiting message before the Room details and roster in the Lobby", () => {
    const html = render({});

    expect(positionOf(html, "Waiting for the Host to start")).toBeLessThan(
      positionOf(html, ROOM_DETAILS),
    );
    expect(positionOf(html, ROOM_DETAILS)).toBeLessThan(positionOf(html, ROSTER));
    expectNoHostUtilities(html);
  });

  it("shows completed Results without the Room details or roster", () => {
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
    expect(html).not.toContain(ROOM_DETAILS);
    expect(html).not.toContain(ROSTER);
  });
});
