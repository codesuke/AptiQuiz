import { randomUUID } from "node:crypto";
import {
  type LobbySnapshot,
  type RevealedRound,
  type RoundView,
  revealedRoundSchema,
  roundViewSchema,
} from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  findFieldPaths,
  join,
  nextRound,
  roundRoom,
  settle,
  sixOptionQuestion,
  startServerWithRooms,
  stopTestServer,
  type TestServer,
  type TestServerOptions,
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

/** A correct Answer received this long after the Round opens scores 880 points. */
const ASHA_RESPONSE_MS = 1_299;
const ASHA_POINTS = 880;
const RAVI_RESPONSE_MS = 2_000;
/** Ends well before the test deadline, so only the grace re-check can close the Round. */
const SHORT_GRACE_MS = 1_000;
const HIDDEN_QUESTION_FIELDS = ["correctOptionId", "explanation"] as const;

afterEach(stopTestServer);

interface OpenedPlayer extends Player {
  readonly round: RoundView;
}

interface RoundTable {
  readonly testServer: TestServer;
  readonly host: TestSocket;
  readonly hostRound: RoundView;
  readonly asha: OpenedPlayer;
  readonly ravi: OpenedPlayer;
}

/** Opens Question 0 of the Round Room for the Host and two Guests, Asha and Ravi. */
async function openTable(options: TestServerOptions = {}): Promise<RoundTable> {
  const testServer = await startServerWithRooms(options, roundRoom);
  const players = [await joinPlayer(testServer, "Asha"), await joinPlayer(testServer, "Ravi")];
  const { host, rounds } = await openRound(testServer, players);
  const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
  const [asha, ravi] = players;
  const [ashaRound, raviRound] = rounds;

  if (
    asha === undefined ||
    ravi === undefined ||
    ashaRound === undefined ||
    raviRound === undefined ||
    !hosted.ok ||
    hosted.round === null
  ) {
    throw new Error("the Round did not open");
  }

  return {
    testServer,
    host,
    hostRound: hosted.round,
    asha: { ...asha, round: ashaRound },
    ravi: { ...ravi, round: raviRound },
  };
}

function answerAt(
  { testServer }: RoundTable,
  player: OpenedPlayer,
  elapsedMs: number,
  text: string,
  key = randomUUID(),
) {
  advanceTo(testServer.clock, player.round.startsAt + elapsedMs);
  return submit(player.socket, player.round, optionIdFor(player.round, text), key);
}

/** Fires the deadline timer the first moment an Answer would be late. */
function passDeadline({ testServer, hostRound }: RoundTable): void {
  advanceTo(testServer.clock, hostRound.endsAt + 1);
  testServer.deadlines.fireDue();
}

function collectRounds(socket: TestSocket): RoundView[] {
  const received: RoundView[] = [];
  socket.on("round:state", (round) => received.push(round));
  return received;
}

function revealed(view: RoundView | null | undefined): RevealedRound {
  return revealedRoundSchema.parse(view);
}

function nextReveal(socket: TestSocket): Promise<RevealedRound> {
  return nextRound(socket).then(revealed);
}

function score(player: Player, displayName: string, points: number) {
  return { participantId: player.participantId, displayName, points };
}

describe("Round closure at the deadline", () => {
  it("closes when the deadline passes and scores unanswered Participants zero", async () => {
    const table = await openTable();
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);
    const reveals = Promise.all([table.asha, table.ravi].map((p) => nextReveal(p.socket)));

    passDeadline(table);
    const [, raviReveal] = await reveals;

    expect(raviReveal).toMatchObject({
      phase: "QUESTION_REVEAL",
      closedAt: table.hostRound.endsAt + 1,
      endsAt: table.hostRound.endsAt,
      answer: null,
      result: { correct: false, points: 0 },
      scores: [
        { ...score(table.asha, "Asha", ASHA_POINTS), answered: true, correct: true },
        { ...score(table.ravi, "Ravi", 0), answered: false, correct: false },
      ],
    });
  });

  it("keeps the Round open through the deadline itself", async () => {
    const table = await openTable();
    const received = collectRounds(table.host);
    advanceTo(table.testServer.clock, table.hostRound.endsAt);

    table.testServer.deadlines.fireDue();
    const lastAnswer = await answerAt(
      table,
      table.ravi,
      table.hostRound.endsAt - table.hostRound.startsAt,
      WRONG_OPTION_TEXT,
    );
    await settle();

    expect(lastAnswer.ok).toBe(true);
    expect(received).toEqual([]);
  });

  it("waits for the deadline when no Participant is connected", async () => {
    const table = await openTable();
    const received = collectRounds(table.host);
    table.asha.socket.disconnect();
    table.ravi.socket.disconnect();
    await settle();

    expect(received).toEqual([]);

    passDeadline(table);
    await settle();

    expect(received.map((round) => round.phase)).toEqual(["QUESTION_REVEAL"]);
  });
});

describe("early Round closure", () => {
  it("closes once every connected Participant has answered and reveals once", async () => {
    const table = await openTable();
    const sockets = [table.host, table.asha.socket, table.ravi.socket];
    const received = sockets.map(collectRounds);
    const lobby = new Promise<LobbySnapshot>((resolve) =>
      table.asha.socket.on("room:lobby", resolve),
    );
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);
    await answerAt(table, table.ravi, RAVI_RESPONSE_MS, WRONG_OPTION_TEXT);
    await settle();

    passDeadline(table);
    await settle();

    expect(received.map((rounds) => rounds.map((round) => round.phase))).toEqual([
      ["QUESTION_REVEAL"],
      ["QUESTION_REVEAL"],
      ["QUESTION_REVEAL"],
    ]);
    expect(received.flat().map((round) => revealed(round).closedAt)).toEqual(
      Array(3).fill(table.hostRound.startsAt + RAVI_RESPONSE_MS),
    );
    await expect(lobby).resolves.toMatchObject({ phase: "QUESTION_REVEAL" });
  });

  it("stays open while a connected Participant has not answered", async () => {
    const table = await openTable();
    const received = collectRounds(table.host);
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);
    await settle();
    const hosted = await table.host.emitWithAck("room:host", { roomId: roundRoom.roomId });

    expect(received).toEqual([]);
    expect(hosted).toMatchObject({ ok: true, round: { phase: "QUESTION_OPEN" } });
    expect(findFieldPaths(hosted, HIDDEN_QUESTION_FIELDS)).toEqual([]);
  });

  it("closes when the last Participant without an Answer loses every socket for the grace", async () => {
    const table = await openTable({ config: { reconnectGraceMs: SHORT_GRACE_MS } });
    const secondSocket = await connectAs(table.testServer.port);
    await join(secondSocket, "Ravi", roundRoom.joinCode, table.ravi.key);
    const received = collectRounds(table.host);
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);

    table.ravi.socket.disconnect();
    await settle();

    expect(received).toEqual([]);

    const reveal = nextReveal(table.host);
    secondSocket.disconnect();
    await settle();
    table.testServer.clock.advance(SHORT_GRACE_MS);
    table.testServer.deadlines.fireDue();

    await expect(reveal).resolves.toMatchObject({
      closedAt: table.hostRound.startsAt + ASHA_RESPONSE_MS + SHORT_GRACE_MS,
      scores: [
        { ...score(table.asha, "Asha", ASHA_POINTS), answered: true },
        { ...score(table.ravi, "Ravi", 0), answered: false },
      ],
    });
  });

  it("closes and reveals once when the last two Answers arrive together", async () => {
    const table = await openTable();
    const received = [table.host, table.asha.socket, table.ravi.socket].map(collectRounds);
    advanceTo(table.testServer.clock, table.hostRound.startsAt + ASHA_RESPONSE_MS);

    await Promise.all([
      submit(
        table.asha.socket,
        table.asha.round,
        optionIdFor(table.asha.round, CORRECT_OPTION_TEXT),
      ),
      submit(table.ravi.socket, table.ravi.round, optionIdFor(table.ravi.round, WRONG_OPTION_TEXT)),
    ]);
    await settle();

    expect(received.map((rounds) => rounds.length)).toEqual([1, 1, 1]);
  });

  it("refuses an Answer the deadline timer beat, revealing once", async () => {
    const table = await openTable();
    const received = collectRounds(table.ravi.socket);
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);

    passDeadline(table);
    const late = await submit(
      table.ravi.socket,
      table.ravi.round,
      optionIdFor(table.ravi.round, CORRECT_OPTION_TEXT),
    );
    await settle();

    expect(late).toEqual({ ok: false, error: "round_not_open" });
    expect(received.map((round) => round.phase)).toEqual(["QUESTION_REVEAL"]);
  });
});

describe("Round reveal", () => {
  it("shows each receiver the correct option in their own id space with their result", async () => {
    const table = await openTable();
    const hostReveal = nextReveal(table.host);
    const ashaReveal = nextReveal(table.asha.socket);
    const raviReveal = nextReveal(table.ravi.socket);
    const ashaAnswer = await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);
    const raviAnswer = await answerAt(table, table.ravi, RAVI_RESPONSE_MS, WRONG_OPTION_TEXT);
    const scores = [
      { ...score(table.asha, "Asha", ASHA_POINTS), answered: true, correct: true },
      { ...score(table.ravi, "Ravi", 0), answered: true, correct: false },
    ];

    await expect(ashaReveal).resolves.toMatchObject({
      question: table.asha.round.question,
      correctOptionId: optionIdFor(table.asha.round, CORRECT_OPTION_TEXT),
      answer: ashaAnswer.ok ? ashaAnswer.answer : null,
      result: { correct: true, points: ASHA_POINTS },
      scores,
    });
    await expect(raviReveal).resolves.toMatchObject({
      question: table.ravi.round.question,
      correctOptionId: optionIdFor(table.ravi.round, CORRECT_OPTION_TEXT),
      answer: raviAnswer.ok ? raviAnswer.answer : null,
      result: { correct: false, points: 0 },
      scores,
    });
    await expect(hostReveal).resolves.toMatchObject({
      question: table.hostRound.question,
      correctOptionId: sixOptionQuestion.correctOptionId,
      answer: null,
      result: null,
      scores,
    });
  });

  it("keeps the correct option and explanation out of every revealed Question", async () => {
    const table = await openTable();
    const reveal = nextReveal(table.asha.socket);

    passDeadline(table);

    expect(findFieldPaths((await reveal).question, HIDDEN_QUESTION_FIELDS)).toEqual([]);
  });
});

describe("after the reveal", () => {
  it("changes no Answer, score, or deadline and repeats replays", async () => {
    const table = await openTable();
    const key = randomUUID();
    const original = await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT, key);
    const reveal = nextReveal(table.asha.socket);
    passDeadline(table);
    const before = await reveal;
    const recorded = table.testServer.registry.answersFor(roundRoom.roomId, 0);

    const replay = await submit(
      table.asha.socket,
      table.asha.round,
      optionIdFor(table.asha.round, WRONG_OPTION_TEXT),
      key,
    );
    const ashaAgain = await submit(
      table.asha.socket,
      table.asha.round,
      optionIdFor(table.asha.round, WRONG_OPTION_TEXT),
    );
    const raviLate = await submit(
      table.ravi.socket,
      table.ravi.round,
      optionIdFor(table.ravi.round, CORRECT_OPTION_TEXT),
    );
    table.testServer.deadlines.fireDue();
    const hosted = await table.host.emitWithAck("room:host", { roomId: roundRoom.roomId });

    expect(replay).toEqual(original);
    expect(ashaAgain).toEqual({ ok: false, error: "round_not_open" });
    expect(raviLate).toEqual({ ok: false, error: "round_not_open" });
    expect(table.testServer.registry.answersFor(roundRoom.roomId, 0)).toEqual(recorded);
    expect(revealed(hosted.ok ? hosted.round : null)).toMatchObject({
      endsAt: before.endsAt,
      closedAt: before.closedAt,
      scores: before.scores,
    });
  });

  it("gives a rejoining Participant the revealed Round", async () => {
    const table = await openTable();
    const reveal = nextReveal(table.asha.socket);
    await answerAt(table, table.asha, ASHA_RESPONSE_MS, CORRECT_OPTION_TEXT);
    passDeadline(table);
    const before = await reveal;

    const rejoined = await join(
      await connectAs(table.testServer.port),
      "Asha",
      roundRoom.joinCode,
      table.asha.key,
    );

    expect(rejoined).toMatchObject({ ok: true, lobby: { phase: "QUESTION_REVEAL" } });
    expect(roundViewSchema.parse(rejoined.ok ? rejoined.round : null)).toEqual({
      ...before,
      serverTime: table.testServer.clock.now(),
    });
  });
});
