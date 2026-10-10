import { randomUUID } from "node:crypto";
import {
  type LobbySnapshot,
  type RoomAdvanceResponse,
  type RoomRegistration,
  type RoundView,
  revealedRoundSchema,
} from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  hostRoom,
  join,
  nextRound,
  otherUser,
  roomA,
  roundRoom,
  settle,
  startRoom,
  startServerWithRooms,
  stopTestServer,
  TEST_ROUND_DURATION_MS,
  type TestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import {
  advanceTo,
  CORRECT_OPTION_TEXT,
  joinPlayer,
  openRound,
  optionIdFor,
  type Player,
  submit,
  WRONG_OPTION_TEXT,
} from "./testing/round-harness.js";

const thirdQuestion = {
  text: "10 - 3?",
  options: [
    { id: "x", text: "6" },
    { id: "y", text: "7" },
    { id: "z", text: "8" },
  ],
  correctOptionId: "y",
  topic: "Arithmetic",
  difficulty: "EASY",
} as const satisfies RoomRegistration["questions"][number];

/** The Round Room with a third Question, so it can advance twice before it finishes. */
const threeQuestionRoom: RoomRegistration = {
  ...roundRoom,
  questions: [...roundRoom.questions, thirdQuestion],
};
const SECOND_QUESTION_TEXT = roomA.questions[0]?.text;
const SECOND_QUESTION_CORRECT_TEXT = "4";
const REVEAL_PAUSE_MS = 3_000;
const ANSWER_DELAY_MS = 1_000;

afterEach(stopTestServer);

interface Table {
  readonly testServer: TestServer;
  readonly host: TestSocket;
  readonly asha: Player;
  readonly ravi: Player;
  /** Each Participant's view of Question 0. */
  readonly firstRounds: readonly [RoundView, RoundView];
}

/** Opens Question 0 of the three-Question Room for the Host and two Guests, Asha and Ravi. */
async function openTable(): Promise<Table> {
  const testServer = await startServerWithRooms({}, threeQuestionRoom);
  const asha = await joinPlayer(testServer, "Asha");
  const ravi = await joinPlayer(testServer, "Ravi");
  const { host, rounds } = await openRound(testServer, [asha, ravi]);
  const [ashaRound, raviRound] = rounds;

  if (ashaRound === undefined || raviRound === undefined) {
    throw new Error("the Round did not open");
  }

  return { testServer, host, asha, ravi, firstRounds: [ashaRound, raviRound] };
}

function advance(socket: TestSocket, key = randomUUID()): Promise<RoomAdvanceResponse> {
  return socket.emitWithAck("room:advance", { roomId: roundRoom.roomId, idempotencyKey: key });
}

async function hostView(table: Table): Promise<RoundView | null> {
  const hosted = await table.host.emitWithAck("room:host", { roomId: roundRoom.roomId });

  if (!hosted.ok) {
    throw new Error(`the Host lost the Room: ${hosted.error}`);
  }

  return hosted.round;
}

/** Closes the open Round at its deadline and waits until every receiver sees the reveal. */
async function revealByDeadline(table: Table): Promise<void> {
  const open = await hostView(table);

  if (open === null) {
    throw new Error("no Round is open");
  }

  const reveals = Promise.all([table.host, table.asha.socket, table.ravi.socket].map(nextRound));
  advanceTo(table.testServer.clock, open.endsAt + 1);
  table.testServer.deadlines.fireDue();
  await reveals;
}

/** Advances after a reveal and returns the Round view each receiver got. */
async function advanceToNextRound(table: Table, key = randomUUID()) {
  const sockets = [table.host, table.asha.socket, table.ravi.socket];
  const views = Promise.all(sockets.map(nextRound));
  const acknowledged = await advance(table.host, key);
  const [hostView, asha, ravi] = await views;

  if (
    !acknowledged.ok ||
    acknowledged.round === null ||
    hostView === undefined ||
    asha === undefined ||
    ravi === undefined
  ) {
    throw new Error("the next Round did not open");
  }

  return { acknowledged, host: acknowledged.round, asha, ravi };
}

function collect<T>(socket: TestSocket, event: "round:state" | "room:lobby"): T[] {
  const received: T[] = [];
  socket.on(event, (payload: unknown) => received.push(payload as T));
  return received;
}

function answer(player: Player, round: RoundView, text: string, key = randomUUID()) {
  return submit(player.socket, round, optionIdFor(round, text), key);
}

describe("room:advance authorization", () => {
  it("lets only the Room's Host advance and changes nothing otherwise", async () => {
    const table = await openTable();
    await revealByDeadline(table);
    const before = await hostView(table);
    const rounds = collect<RoundView>(table.asha.socket, "round:state");
    const guest = await connectAs(table.testServer.port);
    const stranger = await connectAs(table.testServer.port, otherUser);

    const refusals = [
      await advance(guest),
      await advance(stranger),
      await advance(table.asha.socket),
    ];
    await settle();

    expect(refusals).toEqual(Array(3).fill({ ok: false, error: "not_room_host" }));
    expect(rounds).toEqual([]);
    expect(await hostView(table)).toEqual({
      ...before,
      serverTime: table.testServer.clock.now(),
    });
  });

  it("refuses an unknown Room and an invalid payload", async () => {
    const table = await openTable();

    await expect(
      table.host.emitWithAck("room:advance", {
        roomId: "room_missing",
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toEqual({ ok: false, error: "room_not_found" });
    await expect(
      table.host.emitWithAck("room:advance", {
        roomId: roundRoom.roomId,
        idempotencyKey: "not-a-uuid",
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_request" });
  });
});

describe("room:advance phase rules", () => {
  it("refuses to advance in the Lobby", async () => {
    const testServer = await startServerWithRooms({}, threeQuestionRoom);
    const host = await hostRoom(testServer.port, roundRoom.roomId);

    await expect(advance(host)).resolves.toEqual({ ok: false, error: "round_not_revealed" });
    await expect(startRoom(host, roundRoom.roomId)).resolves.toMatchObject({ ok: true });
  });

  it("refuses to advance while the Round is open", async () => {
    const table = await openTable();

    await expect(advance(table.host)).resolves.toEqual({
      ok: false,
      error: "round_not_revealed",
    });
    expect(await hostView(table)).toMatchObject({ phase: "QUESTION_OPEN", questionIndex: 0 });
  });
});

describe("advancing after a reveal", () => {
  it("opens the next Question with a new server start time and deadline", async () => {
    const table = await openTable();
    const [ashaFirst] = table.firstRounds;
    await answer(table.asha, ashaFirst, CORRECT_OPTION_TEXT);
    await revealByDeadline(table);
    const firstAnswers = table.testServer.registry.answersFor(roundRoom.roomId, 0);
    const lobby = new Promise<LobbySnapshot>((resolve) =>
      table.asha.socket.once("room:lobby", resolve),
    );
    table.testServer.clock.advance(REVEAL_PAUSE_MS);
    const advancedAt = table.testServer.clock.now();

    const { acknowledged, host, asha, ravi } = await advanceToNextRound(table);

    const opened = {
      phase: "QUESTION_OPEN",
      questionIndex: 1,
      questionCount: 3,
      startsAt: advancedAt,
      endsAt: advancedAt + TEST_ROUND_DURATION_MS,
      answer: null,
    };
    expect(acknowledged).toMatchObject({ ok: true, lobby: { phase: "QUESTION_OPEN" } });
    expect(host).toMatchObject({
      ...opened,
      question: { text: SECOND_QUESTION_TEXT, options: roomA.questions[0]?.options },
    });
    expect(asha).toMatchObject({ ...opened, question: { text: SECOND_QUESTION_TEXT } });
    expect(ravi).toMatchObject(opened);
    expect(asha.question.options.map(({ text }) => text).sort()).toEqual(["3", "4"]);
    expect(asha.question.options.map(({ id }) => id)).not.toContain("a");
    await expect(lobby).resolves.toMatchObject({ phase: "QUESTION_OPEN" });
    expect(table.testServer.registry.answersFor(roundRoom.roomId, 0)).toEqual(firstAnswers);
    expect(table.testServer.registry.answersFor(roundRoom.roomId, 1)).toEqual([]);
  });

  it("repeats a retried advance and never skips a Question or opens two Rounds", async () => {
    const table = await openTable();
    await revealByDeadline(table);
    const key = randomUUID();
    const rounds = collect<RoundView>(table.asha.socket, "round:state");

    const first = await advance(table.host, key);
    const retried = await advance(table.host, key);
    const another = await advance(table.host);
    await settle();

    expect(retried).toEqual(first);
    expect(another).toEqual({ ok: false, error: "round_not_revealed" });
    expect(rounds.map(({ questionIndex, phase }) => ({ questionIndex, phase }))).toEqual([
      { questionIndex: 1, phase: "QUESTION_OPEN" },
    ]);

    await revealByDeadline(table);
    const third = await advanceToNextRound(table);

    expect(third.host.questionIndex).toBe(2);
    expect(third.host.question.text).toBe(thirdQuestion.text);
    await expect(advance(table.host, key)).resolves.toEqual(first);
  });
});

describe("the next Round", () => {
  it("closes early only once every Participant answers this Round", async () => {
    const table = await openTable();
    const [ashaFirst, raviFirst] = table.firstRounds;
    await answer(table.asha, ashaFirst, CORRECT_OPTION_TEXT);
    const firstReveals = Promise.all(
      [table.host, table.asha.socket, table.ravi.socket].map(nextRound),
    );
    await answer(table.ravi, raviFirst, WRONG_OPTION_TEXT);
    await firstReveals;
    const next = await advanceToNextRound(table);
    const hostRounds = collect<RoundView>(table.host, "round:state");

    table.testServer.clock.advance(ANSWER_DELAY_MS);
    await answer(table.asha, next.asha, SECOND_QUESTION_CORRECT_TEXT);
    await settle();

    expect(hostRounds).toEqual([]);

    const reveal = nextRound(table.host);
    await answer(table.ravi, next.ravi, "3");
    const revealed = revealedRoundSchema.parse(await reveal);

    expect(revealed).toMatchObject({
      questionIndex: 1,
      closedAt: next.host.startsAt + ANSWER_DELAY_MS,
      scores: [
        { participantId: table.asha.participantId, answered: true, correct: true },
        { participantId: table.ravi.participantId, answered: true, correct: false, points: 0 },
      ],
    });
  });

  it("closes at its own deadline, not the first Round's", async () => {
    const table = await openTable();
    await revealByDeadline(table);
    table.testServer.clock.advance(REVEAL_PAUSE_MS);
    const next = await advanceToNextRound(table);
    const hostRounds = collect<RoundView>(table.host, "round:state");

    advanceTo(table.testServer.clock, next.host.endsAt);
    table.testServer.deadlines.fireDue();
    await settle();

    expect(hostRounds).toEqual([]);

    advanceTo(table.testServer.clock, next.host.endsAt + 1);
    table.testServer.deadlines.fireDue();
    await settle();

    expect(hostRounds).toMatchObject([
      {
        phase: "QUESTION_REVEAL",
        questionIndex: 1,
        closedAt: next.host.endsAt + 1,
        scores: [
          { participantId: table.asha.participantId, answered: false, points: 0 },
          { participantId: table.ravi.participantId, answered: false, points: 0 },
        ],
      },
    ]);
  });

  it("refuses an Answer for an earlier Question and repeats that Question's replays", async () => {
    const table = await openTable();
    const [ashaFirst] = table.firstRounds;
    const key = randomUUID();
    const original = await answer(table.asha, ashaFirst, CORRECT_OPTION_TEXT, key);
    await revealByDeadline(table);
    await advanceToNextRound(table);

    const replay = await answer(table.asha, ashaFirst, CORRECT_OPTION_TEXT, key);
    const stale = await answer(table.ravi, table.firstRounds[1], CORRECT_OPTION_TEXT);

    expect(original.ok).toBe(true);
    expect(replay).toEqual(original);
    expect(stale).toEqual({ ok: false, error: "wrong_round" });
    expect(table.testServer.registry.answersFor(roundRoom.roomId, 1)).toEqual([]);
  });
});

describe("finishing the Room", () => {
  it("finishes after the last Question without opening another Round", async () => {
    const table = await openTable();
    await revealByDeadline(table);
    await advanceToNextRound(table);
    await revealByDeadline(table);
    await advanceToNextRound(table);
    await revealByDeadline(table);
    const rounds = collect<RoundView>(table.asha.socket, "round:state");
    const lobbies = collect<LobbySnapshot>(table.asha.socket, "room:lobby");

    const finished = await advance(table.host);
    await settle();

    expect(finished).toMatchObject({ ok: true, lobby: { phase: "FINISHED" }, round: null });
    expect(rounds).toEqual([]);
    expect(lobbies).toMatchObject([{ phase: "FINISHED" }]);
    expect(table.testServer.store.finishedRoomIds).toEqual([roundRoom.roomId]);
    await expect(advance(table.host)).resolves.toEqual({ ok: false, error: "room_finished" });
    expect(await hostView(table)).toBeNull();
    await expect(
      join(await connectAs(table.testServer.port), "Asha", roundRoom.joinCode, table.asha.key),
    ).resolves.toMatchObject({ ok: true, lobby: { phase: "FINISHED" }, round: null });
  });
});
