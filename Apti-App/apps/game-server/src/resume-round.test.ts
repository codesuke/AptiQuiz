import { randomUUID } from "node:crypto";
import {
  type LobbySnapshot,
  type RevealedRound,
  type RoundView,
  revealedRoundSchema,
  roomResumeResponseSchema,
  type SocketTicketSubject,
} from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_RECONNECT_GRACE_MS } from "./config.js";
import {
  openResumableTable,
  type ResumableTable,
  reconnect,
  resume,
  type SeatedParticipant,
} from "./testing/resume-harness.js";
import {
  connectAs,
  findFieldPaths,
  nextRound,
  otherUser,
  roundRoom,
  settle,
  stopTestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import {
  advanceTo,
  CORRECT_OPTION_TEXT,
  optionIdFor,
  submit,
  WRONG_OPTION_TEXT,
} from "./testing/round-harness.js";

/** Long enough that the reconnect grace ends well before the deadline. */
const ROUND_DURATION_MS = 30_000;
const ASHA_RESPONSE_MS = 1_000;
const RAVI_LEAVES_AT_MS = 2_000;
/** The correct option text of the second `roundRoom` Question. */
const SECOND_QUESTION_CORRECT_TEXT = "4";
const HIDDEN_QUESTION_FIELDS = ["correctOptionId", "explanation"] as const;

afterEach(stopTestServer);

function openTable(raviUser?: SocketTicketSubject): Promise<ResumableTable> {
  return openResumableTable({ config: { roundDurationMs: ROUND_DURATION_MS } }, raviUser);
}

function collectRounds(socket: TestSocket): RoundView[] {
  const received: RoundView[] = [];
  socket.on("round:state", (round) => received.push(round));
  return received;
}

function revealed(view: RoundView | null | undefined): RevealedRound {
  return revealedRoundSchema.parse(view);
}

/** Moves the server clock to `elapsedMs` after the first Round opened, then fires due timers. */
function moveTo({ testServer, asha }: ResumableTable, elapsedMs: number): void {
  advanceTo(testServer.clock, asha.round.startsAt + elapsedMs);
  testServer.deadlines.fireDue();
}

function answerCorrectly(socket: TestSocket, round: RoundView, key = randomUUID()) {
  return submit(socket, round, optionIdFor(round, CORRECT_OPTION_TEXT), key);
}

async function ashaAnswersFirst(table: ResumableTable): Promise<void> {
  moveTo(table, ASHA_RESPONSE_MS);
  await expect(answerCorrectly(table.asha.socket, table.asha.round)).resolves.toMatchObject({
    ok: true,
  });
}

/** Ravi's browser refreshes: his only socket drops at `RAVI_LEAVES_AT_MS`. */
async function raviLeaves(table: ResumableTable): Promise<void> {
  moveTo(table, RAVI_LEAVES_AT_MS);
  table.ravi.socket.disconnect();
  await settle();
}

async function resumeOnFreshSocket(table: ResumableTable, participant: SeatedParticipant) {
  const fresh = await connectAs(table.testServer.port);
  const resumed = await resume(fresh, participant.resumeToken, roundRoom.joinCode);
  return { fresh, resumed };
}

function openRoundOf(resumed: Awaited<ReturnType<typeof resume>>): RoundView {
  if (!resumed.ok || resumed.round === null) {
    throw new Error("the resume did not return a Round");
  }

  return resumed.round;
}

describe("reconnect grace during an open Round", () => {
  it("keeps the Round open while an unanswered Participant refreshes, then counts their Answer", async () => {
    const table = await openTable();
    const hostRounds = collectRounds(table.host);
    await ashaAnswersFirst(table);

    await raviLeaves(table);
    expect(hostRounds).toEqual([]);

    moveTo(table, RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS - 1);
    await settle();
    expect(hostRounds).toEqual([]);

    const { fresh, resumed } = await resumeOnFreshSocket(table, table.ravi);
    const freshRounds = collectRounds(fresh);
    moveTo(table, RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS);
    await settle();
    expect(hostRounds).toEqual([]);

    await expect(answerCorrectly(fresh, openRoundOf(resumed))).resolves.toMatchObject({ ok: true });
    await settle();

    const raviReveal = revealed(freshRounds[0]);
    expect(hostRounds.map((round) => round.phase)).toEqual(["QUESTION_REVEAL"]);
    expect(raviReveal).toMatchObject({
      endsAt: table.ravi.round.endsAt,
      closedAt: table.asha.round.startsAt + RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS,
      result: { correct: true },
    });
    expect(raviReveal.result?.points).toBeGreaterThan(0);
  });

  it("closes early once the grace passes without the Participant, leaving the deadline", async () => {
    const table = await openTable();
    const hostRounds = collectRounds(table.host);
    await ashaAnswersFirst(table);
    await raviLeaves(table);

    moveTo(table, RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS - 1);
    await settle();
    expect(hostRounds).toEqual([]);

    moveTo(table, RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS);
    await settle();

    expect(hostRounds).toHaveLength(1);
    expect(revealed(hostRounds[0])).toMatchObject({
      endsAt: table.asha.round.endsAt,
      closedAt: table.asha.round.startsAt + RAVI_LEAVES_AT_MS + DEFAULT_RECONNECT_GRACE_MS,
      scores: [
        { participantId: table.asha.participantId, answered: true },
        { participantId: table.ravi.participantId, answered: false, points: 0 },
      ],
    });
  });

  it("does nothing when the grace ends after the Round closed or the Host advanced", async () => {
    const table = await openTable();
    const hostRounds = collectRounds(table.host);
    await ashaAnswersFirst(table);
    const leavesNearDeadline = ROUND_DURATION_MS - 1_000;
    moveTo(table, leavesNearDeadline);
    table.ravi.socket.disconnect();
    await settle();

    moveTo(table, ROUND_DURATION_MS + 1);
    await settle();
    expect(hostRounds.map((round) => round.phase)).toEqual(["QUESTION_REVEAL"]);

    const lobbies: LobbySnapshot[] = [];
    table.asha.socket.on("room:lobby", (lobby) => lobbies.push(lobby));
    await table.host.emitWithAck("room:advance", {
      roomId: roundRoom.roomId,
      idempotencyKey: randomUUID(),
    });
    moveTo(table, leavesNearDeadline + DEFAULT_RECONNECT_GRACE_MS);
    await settle();

    expect(hostRounds.map((round) => [round.questionIndex, round.phase])).toEqual([
      [0, "QUESTION_REVEAL"],
      [1, "QUESTION_OPEN"],
    ]);
    expect(lobbies.map((lobby) => lobby.phase)).toEqual(["QUESTION_OPEN"]);
  });
});

describe("room:resume during an open Round", () => {
  it("returns the same Question, option order, ids, and deadline, with no correct option", async () => {
    const table = await openTable();
    await raviLeaves(table);

    const { resumed } = await resumeOnFreshSocket(table, table.ravi);

    expect(roomResumeResponseSchema.parse(resumed)).toEqual(resumed);
    expect(resumed).toMatchObject({
      ok: true,
      participant: { participantId: table.ravi.participantId },
      score: 0,
    });
    expect(openRoundOf(resumed)).toEqual({
      ...table.ravi.round,
      serverTime: table.ravi.round.startsAt + RAVI_LEAVES_AT_MS,
    });
    expect(findFieldPaths(resumed, HIDDEN_QUESTION_FIELDS)).toEqual([]);
  });

  it("keeps an Answer locked before the disconnect", async () => {
    const table = await openTable();
    moveTo(table, ASHA_RESPONSE_MS);
    const locked = await submit(
      table.ravi.socket,
      table.ravi.round,
      optionIdFor(table.ravi.round, WRONG_OPTION_TEXT),
    );
    await raviLeaves(table);

    const { fresh, resumed } = await resumeOnFreshSocket(table, table.ravi);
    const round = openRoundOf(resumed);

    expect(locked.ok).toBe(true);
    expect(round.answer).toEqual(locked.ok ? locked.answer : null);
    expect(findFieldPaths(resumed, HIDDEN_QUESTION_FIELDS)).toEqual([]);
    await expect(answerCorrectly(fresh, round)).resolves.toEqual({
      ok: false,
      error: "already_answered",
    });
  });

  it("returns a signed-in Participant to the open Round with a fresh Socket Ticket", async () => {
    const table = await openTable(otherUser);

    const fresh = await reconnect(table.testServer.port, table.ravi.socket, otherUser);
    const resumed = await resume(fresh, table.ravi.resumeToken, roundRoom.joinCode);

    expect(resumed).toMatchObject({
      ok: true,
      participant: { participantId: table.ravi.participantId, isGuest: false },
      round: { phase: "QUESTION_OPEN", questionIndex: 0, endsAt: table.asha.round.endsAt },
    });
  });

  it("changes nothing when repeated after a lost acknowledgement", async () => {
    const table = await openTable();
    await raviLeaves(table);
    const lobbies: LobbySnapshot[] = [];
    table.host.on("room:lobby", (lobby) => lobbies.push(lobby));
    const fresh = await connectAs(table.testServer.port);

    const first = await resume(fresh, table.ravi.resumeToken, roundRoom.joinCode);
    const second = await resume(fresh, table.ravi.resumeToken, roundRoom.joinCode);
    await settle();

    expect(second).toEqual(first);
    expect(first.ok && first.lobby.participants).toHaveLength(2);
    expect(table.testServer.store.participants).toHaveLength(2);
    expect(lobbies).toEqual([]);
  });
});

describe("room:resume after the reveal", () => {
  async function revealBoth(table: ResumableTable): Promise<RevealedRound> {
    const reveal = nextRound(table.ravi.socket).then(revealed);
    await ashaAnswersFirst(table);
    await answerCorrectly(table.ravi.socket, table.ravi.round);
    return reveal;
  }

  it("returns the revealed view with the Participant's result and Leaderboard score", async () => {
    const table = await openTable();
    const raviReveal = await revealBoth(table);
    const raviTotal = raviReveal.leaderboard.find(
      (entry) => entry.participantId === table.ravi.participantId,
    )?.totalScore;

    const fresh = await reconnect(table.testServer.port, table.ravi.socket);
    const resumed = await resume(fresh, table.ravi.resumeToken, roundRoom.joinCode);

    expect(resumed).toMatchObject({ ok: true, score: raviTotal });
    expect(raviTotal).toBeGreaterThan(0);
    expect(revealed(openRoundOf(resumed))).toEqual({
      ...raviReveal,
      serverTime: raviReveal.closedAt,
    });
    expect(raviReveal.correctOptionId).toBe(optionIdFor(table.ravi.round, CORRECT_OPTION_TEXT));
  });

  it("sends the next Round to the resumed socket after the Host advances", async () => {
    const table = await openTable();
    await revealBoth(table);
    const fresh = await reconnect(table.testServer.port, table.ravi.socket);
    await resume(fresh, table.ravi.resumeToken, roundRoom.joinCode);
    const next = nextRound(fresh);

    await table.host.emitWithAck("room:advance", {
      roomId: roundRoom.roomId,
      idempotencyKey: randomUUID(),
    });

    const opened = await next;
    expect(opened).toMatchObject({ phase: "QUESTION_OPEN", questionIndex: 1, answer: null });
    await expect(
      submit(fresh, opened, optionIdFor(opened, SECOND_QUESTION_CORRECT_TEXT)),
    ).resolves.toMatchObject({ ok: true });
  });
});
