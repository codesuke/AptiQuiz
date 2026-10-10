import type {
  LobbySnapshot,
  RoomJoin,
  RoomJoinResponse,
  RoomResume,
  RoomResumeResponse,
  RoundAnswer,
  RoundAnswerResponse,
  RoundView,
} from "@aptiquiz/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRoomSocket,
  emitRoomJoin,
  emitRoomResume,
  emitRoundAnswer,
  parseLobbyUpdate,
  parseRoundUpdate,
  type RoomSocket,
} from "./room-socket";

const lobby: LobbySnapshot = {
  roomId: "room-1",
  joinCode: "AB3CD9",
  phase: "LOBBY",
  college: { id: "college-1", name: "Example College" },
  questionSetTitle: "Quant warm-up",
  questionCount: 10,
  participants: [{ participantId: "p-1", displayName: "Asha", isGuest: true }],
  rules: { roundDurationMs: 30_000, maxDelayCompensationMs: 100, scoreBucketMs: 100 },
};

const round: RoundView = {
  phase: "QUESTION_OPEN",
  roomId: "room-1",
  questionIndex: 0,
  questionCount: 10,
  startsAt: 1_000,
  endsAt: 31_000,
  serverTime: 1_200,
  question: {
    text: "What is 2 + 2?",
    options: [
      { id: "opt-b", text: "4" },
      { id: "opt-a", text: "3" },
    ],
    topic: "Arithmetic",
    difficulty: "EASY",
  },
  answer: null,
};

const attempt: RoomJoin = {
  joinCode: "AB3CD9",
  displayName: "Asha",
  idempotencyKey: "4f0c2b8e-8d1a-4f43-9a55-0e6f7d3b2c11",
};

const resumeToken = "r".repeat(43);

type Listener = (...args: unknown[]) => void;

/** Records `on` registrations so a test can fire a server event at the socket. */
function fakeSocket() {
  const listeners = new Map<string, Listener>();
  const socket = {
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener);
      return socket;
    }),
  };
  const fire = (event: string, ...args: unknown[]) => listeners.get(event)?.(...args);
  return { socket: socket as unknown as RoomSocket, fire };
}

describe("createRoomSocket", () => {
  it("connects over WebSocket with a fresh Socket Ticket on every attempt", async () => {
    const { socket } = fakeSocket();
    const connect = vi.fn().mockReturnValue(socket);
    const requestAuth = vi.fn().mockResolvedValue({ ticket: "fresh" });

    expect(createRoomSocket({ connect, requestAuth, serverUrl: "http://game.test" })).toBe(socket);

    const [url, options] = connect.mock.calls[0] ?? [];
    expect(url).toBe("http://game.test");
    expect(options).toMatchObject({ reconnection: true, transports: ["websocket"] });

    const callback = vi.fn();
    options.auth(callback);
    options.auth(callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(2));
    expect(callback).toHaveBeenCalledWith({ ticket: "fresh" });
    expect(requestAuth).toHaveBeenCalledTimes(2);
  });

  it("acknowledges a latency ping at once so the server can measure round-trip delay", () => {
    const { socket, fire } = fakeSocket();
    createRoomSocket({ connect: () => socket, requestAuth: vi.fn() });

    const acknowledge = vi.fn();
    fire("latency:ping", { serverSentAt: 1_000 }, acknowledge);

    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(acknowledge).toHaveBeenCalledWith();
  });
});

describe("emitRoomJoin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the validated acknowledgement", async () => {
    const response: RoomJoinResponse = {
      ok: true,
      participant: { participantId: "p-1", displayName: "Asha", isGuest: true },
      lobby,
      round: null,
      resumeToken,
    };
    const send = vi.fn((_payload: RoomJoin, acknowledge: (value: unknown) => void) =>
      acknowledge(response),
    );

    await expect(emitRoomJoin(send, attempt)).resolves.toEqual(response);
    expect(send).toHaveBeenCalledWith(attempt, expect.any(Function));
  });

  it("carries the current Round so a rejoin restores the Question", async () => {
    const response: RoomJoinResponse = {
      ok: true,
      participant: { participantId: "p-1", displayName: "Asha", isGuest: true },
      lobby: { ...lobby, phase: "QUESTION_OPEN" },
      round,
      resumeToken,
    };
    const send = (_payload: RoomJoin, acknowledge: (value: unknown) => void) =>
      acknowledge(response);

    await expect(emitRoomJoin(send, attempt)).resolves.toMatchObject({ ok: true, round });
  });

  it("passes Room errors through", async () => {
    const send = (_payload: RoomJoin, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: false, error: "room_full" });

    await expect(emitRoomJoin(send, attempt)).resolves.toEqual({ ok: false, error: "room_full" });
  });

  it("treats a malformed acknowledgement as a retryable failure", async () => {
    const send = (_payload: RoomJoin, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: true });

    await expect(emitRoomJoin(send, attempt)).resolves.toEqual({
      ok: false,
      error: "join_failed",
    });
  });

  it("gives up with no_response when the Game Server does not answer", async () => {
    vi.useFakeTimers();
    const result = emitRoomJoin(() => undefined, attempt, 5_000);

    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toEqual({ ok: false, error: "no_response" });
  });
});

describe("emitRoomResume", () => {
  const resume: RoomResume = { joinCode: "AB3CD9", resumeToken };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the validated acknowledgement with the restored Participant and score", async () => {
    const response: RoomResumeResponse = {
      ok: true,
      participant: { participantId: "p-1", displayName: "Asha", isGuest: true },
      lobby,
      round: null,
      score: 1_800,
    };
    const send = vi.fn((_payload: RoomResume, acknowledge: (value: unknown) => void) =>
      acknowledge(response),
    );

    await expect(emitRoomResume(send, resume)).resolves.toEqual(response);
    expect(send).toHaveBeenCalledWith(resume, expect.any(Function));
  });

  it("passes a refused Resume Token through", async () => {
    const send = (_payload: RoomResume, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: false, error: "invalid_resume_token" });

    await expect(emitRoomResume(send, resume)).resolves.toEqual({
      ok: false,
      error: "invalid_resume_token",
    });
  });

  it("treats a malformed acknowledgement as a retryable failure", async () => {
    const send = (_payload: RoomResume, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: true, participant: { participantId: "p-1" }, score: -1 });

    await expect(emitRoomResume(send, resume)).resolves.toEqual({
      ok: false,
      error: "join_failed",
    });
  });

  it("gives up with no_response when the Game Server does not answer", async () => {
    vi.useFakeTimers();
    const result = emitRoomResume(() => undefined, resume, 4_000);

    await vi.advanceTimersByTimeAsync(4_000);
    await expect(result).resolves.toEqual({ ok: false, error: "no_response" });
  });
});

const answerPayload: RoundAnswer = {
  roomId: "room-1",
  questionIndex: 0,
  optionId: "opt-b",
  idempotencyKey: "9a1c2b8e-8d1a-4f43-9a55-0e6f7d3b2c22",
};

describe("emitRoundAnswer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the accepted Answer without any correctness field", async () => {
    const response: RoundAnswerResponse = {
      ok: true,
      answer: { questionIndex: 0, optionId: "opt-b", receivedAt: 5_000 },
    };
    const send = vi.fn((_payload: RoundAnswer, acknowledge: (value: unknown) => void) =>
      acknowledge({ ...response, correct: true }),
    );

    await expect(emitRoundAnswer(send, answerPayload)).resolves.toEqual(response);
    expect(send).toHaveBeenCalledWith(answerPayload, expect.any(Function));
  });

  it("passes Answer refusals through", async () => {
    const send = (_payload: RoundAnswer, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: false, error: "answer_too_late" });

    await expect(emitRoundAnswer(send, answerPayload)).resolves.toEqual({
      ok: false,
      error: "answer_too_late",
    });
  });

  it("treats a malformed acknowledgement as a retryable failure", async () => {
    const send = (_payload: RoundAnswer, acknowledge: (value: unknown) => void) =>
      acknowledge({ ok: false, error: "nope" });

    await expect(emitRoundAnswer(send, answerPayload)).resolves.toEqual({
      ok: false,
      error: "answer_failed",
    });
  });

  it("gives up with no_response when the Game Server does not answer", async () => {
    vi.useFakeTimers();
    const result = emitRoundAnswer(() => undefined, answerPayload, 3_000);

    await vi.advanceTimersByTimeAsync(3_000);
    await expect(result).resolves.toEqual({ ok: false, error: "no_response" });
  });
});

describe("parseLobbyUpdate", () => {
  it("accepts a snapshot for the joined Room", () => {
    expect(parseLobbyUpdate({ ...lobby, phase: "QUESTION_OPEN" }, "room-1")?.phase).toBe(
      "QUESTION_OPEN",
    );
  });

  it("ignores malformed payloads and other Rooms", () => {
    expect(parseLobbyUpdate({ roomId: "room-1" }, "room-1")).toBeNull();
    expect(parseLobbyUpdate({ ...lobby, roomId: "room-2" }, "room-1")).toBeNull();
  });
});

describe("parseRoundUpdate", () => {
  it("accepts a Round view for the joined Room and keeps the option order", () => {
    expect(parseRoundUpdate(round, "room-1")?.question.options.map((option) => option.id)).toEqual([
      "opt-b",
      "opt-a",
    ]);
  });

  it("ignores malformed payloads and other Rooms", () => {
    expect(parseRoundUpdate({ ...round, endsAt: "soon" }, "room-1")).toBeNull();
    expect(parseRoundUpdate({ ...round, phase: "LOBBY" }, "room-1")).toBeNull();
    expect(parseRoundUpdate({ ...round, roomId: "room-2" }, "room-1")).toBeNull();
  });

  it("accepts a revealed Round with the correct option, result, and scores", () => {
    const revealed: RoundView = {
      ...round,
      phase: "QUESTION_REVEAL",
      closedAt: 31_000,
      revealEndsAt: 37_000,
      correctOptionId: "opt-b",
      answer: { questionIndex: 0, optionId: "opt-b", receivedAt: 4_000 },
      result: { correct: true, points: 900 },
      scores: [
        { participantId: "p-1", displayName: "Asha", answered: true, correct: true, points: 900 },
      ],
      leaderboard: [
        { participantId: "p-1", displayName: "Asha", rank: 1, totalScore: 900, movement: null },
      ],
    };

    const parsed = parseRoundUpdate(revealed, "room-1");
    expect(parsed?.phase).toBe("QUESTION_REVEAL");
    expect(parsed).toEqual(revealed);
    expect(parseRoundUpdate({ ...revealed, scores: undefined }, "room-1")).toBeNull();
  });
});
