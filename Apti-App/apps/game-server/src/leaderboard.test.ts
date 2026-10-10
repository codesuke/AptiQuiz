import { randomUUID } from "node:crypto";
import {
  type RevealedRound,
  type RoomRegistration,
  type RoundView,
  revealedRoundSchema,
} from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  join,
  nextRound,
  roomA,
  roundRoom,
  settle,
  startServerWithRooms,
  stopTestServer,
  type TestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import {
  advanceTo,
  CORRECT_OPTION_TEXT,
  joinPlayer,
  openNextAfterReveal,
  openRound,
  optionIdFor,
  type Player,
  submit,
  WRONG_OPTION_TEXT,
} from "./testing/round-harness.js";

const SECOND_CORRECT_TEXT = "4";
const SECOND_WRONG_TEXT = "3";
const JOIN_GAP_MS = 10;
/** On the 5 second test Round, an Answer 1000 ms in scores 500 + floor(500 * 0.8) = 900. */
const FIRST_ANSWER_MS = 1_000;
const FIRST_ANSWER_POINTS = 900;
const SECOND_ANSWER_MS = 500;
const SECOND_ANSWER_POINTS = 950;

const twoQuestionRoom: RoomRegistration = {
  ...roundRoom,
  questions: [...roundRoom.questions, ...roomA.questions.slice(0, 1)],
};

afterEach(stopTestServer);

interface Table {
  readonly testServer: TestServer;
  readonly host: TestSocket;
  readonly players: readonly Player[];
  /** The latest Round view of each Participant, in `players` order. */
  rounds: readonly RoundView[];
}

/** Joins the named Guests, `JOIN_GAP_MS` apart, then opens Question 0. */
async function openTable(...names: string[]): Promise<Table> {
  const testServer = await startServerWithRooms({}, twoQuestionRoom);
  const players: Player[] = [];

  for (const name of names) {
    testServer.clock.advance(JOIN_GAP_MS);
    players.push(await joinPlayer(testServer, name));
  }

  const { host, rounds } = await openRound(testServer, players);
  return { testServer, host, players, rounds };
}

/** Resolves with the reveal each given socket receives; by default the Host and all players. */
function reveals(
  table: Table,
  sockets: readonly TestSocket[] = [table.host, ...table.players.map((p) => p.socket)],
): Promise<RevealedRound[]> {
  return Promise.all(
    sockets.map((socket) => nextRound(socket).then((view) => revealedRoundSchema.parse(view))),
  );
}

async function answerAt(table: Table, index: number, elapsedMs: number, text: string) {
  const player = table.players[index];
  const round = table.rounds[index];

  if (player === undefined || round === undefined) {
    throw new Error(`no player ${index}`);
  }

  advanceTo(table.testServer.clock, round.startsAt + elapsedMs);
  return submit(player.socket, round, optionIdFor(round, text), randomUUID());
}

/** Lets the deadline close the open Round and returns what the Host and each Participant saw. */
async function closeByDeadline(
  table: Table,
  sockets?: readonly TestSocket[],
): Promise<RevealedRound[]> {
  const seen = reveals(table, sockets);
  const [round] = table.rounds;
  advanceTo(table.testServer.clock, (round?.endsAt ?? 0) + 1);
  table.testServer.deadlines.fireDue();
  return seen;
}

async function advanceToSecondRound(table: Table): Promise<void> {
  const opened = Promise.all(table.players.map((player) => nextRound(player.socket)));
  const hosted = await table.host.emitWithAck("room:host", { roomId: roundRoom.roomId });
  if (!hosted.ok || !hosted.round) throw new Error("no revealed Round");
  await openNextAfterReveal(table.testServer, hosted.round);
  table.rounds = await opened;
}

function standings(reveal: RevealedRound) {
  return reveal.leaderboard.map(({ participantId, rank, totalScore, movement }) => ({
    participantId,
    rank,
    totalScore,
    movement,
  }));
}

describe("Leaderboard after a Round", () => {
  it("shows the Host and every Participant the same standings with neutral movement", async () => {
    const table = await openTable("Asha", "Ravi");
    const [asha, ravi] = table.players;
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    const seen = reveals(table);
    await answerAt(table, 1, FIRST_ANSWER_MS, WRONG_OPTION_TEXT);
    const [hostReveal, ...participantReveals] = await seen;

    const expected = [
      {
        participantId: asha?.participantId,
        rank: 1,
        totalScore: FIRST_ANSWER_POINTS,
        movement: null,
      },
      { participantId: ravi?.participantId, rank: 2, totalScore: 0, movement: null },
    ];
    expect(hostReveal && standings(hostReveal)).toEqual(expected);

    for (const reveal of participantReveals) {
      expect(reveal.leaderboard).toEqual(hostReveal?.leaderboard);
    }
  });

  it("carries display names and lists unanswered and disconnected Participants with zero", async () => {
    const table = await openTable("Asha", "Ravi", "Meera");
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    table.players[2]?.socket.disconnect();
    await settle();

    const [hostReveal] = await closeByDeadline(table, [table.host]);

    expect(hostReveal?.leaderboard).toMatchObject([
      { displayName: "Asha", rank: 1, totalScore: FIRST_ANSWER_POINTS },
      { displayName: "Ravi", rank: 2, totalScore: 0 },
      { displayName: "Meera", rank: 3, totalScore: 0 },
    ]);
  });

  it("orders equal scores by earlier Lobby join, so every client sees one order", async () => {
    const table = await openTable("Late", "Later");
    const first = table.players[0];
    const second = table.players[1];
    await answerAt(table, 1, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    const seen = reveals(table);
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    const [hostReveal, ...others] = await seen;

    expect(hostReveal?.leaderboard.map((entry) => entry.participantId)).toEqual([
      first?.participantId,
      second?.participantId,
    ]);
    expect(hostReveal?.leaderboard.map((entry) => entry.rank)).toEqual([1, 2]);
    for (const reveal of others) {
      expect(reveal.leaderboard).toEqual(hostReveal?.leaderboard);
    }
  });

  it("compares movement with the previous completed Round when the winner changes", async () => {
    const table = await openTable("Asha", "Ravi");
    const [asha, ravi] = table.players;
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    await answerAt(table, 1, FIRST_ANSWER_MS * 2, WRONG_OPTION_TEXT);
    await settle();
    await advanceToSecondRound(table);
    await answerAt(table, 0, SECOND_ANSWER_MS, SECOND_WRONG_TEXT);
    const seen = reveals(table);
    await answerAt(table, 1, SECOND_ANSWER_MS, SECOND_CORRECT_TEXT);
    const [hostReveal, ...participantReveals] = await seen;

    expect(hostReveal && standings(hostReveal)).toEqual([
      {
        participantId: ravi?.participantId,
        rank: 1,
        totalScore: SECOND_ANSWER_POINTS,
        movement: 1,
      },
      {
        participantId: asha?.participantId,
        rank: 2,
        totalScore: FIRST_ANSWER_POINTS,
        movement: -1,
      },
    ]);
    for (const reveal of participantReveals) {
      expect(reveal.leaderboard).toEqual(hostReveal?.leaderboard);
    }
  });

  it("keeps movement 0 when ranks do not change", async () => {
    const table = await openTable("Asha", "Ravi");
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    await closeByDeadline(table);
    await advanceToSecondRound(table);
    await answerAt(table, 0, SECOND_ANSWER_MS, SECOND_CORRECT_TEXT);
    const [hostReveal] = await closeByDeadline(table);

    expect(hostReveal?.leaderboard.map((entry) => entry.movement)).toEqual([0, 0]);
    expect(hostReveal?.leaderboard[0]?.totalScore).toBe(FIRST_ANSWER_POINTS + SECOND_ANSWER_POINTS);
  });

  it("gives a returning Host and a rejoining Participant the current standings", async () => {
    const table = await openTable("Asha", "Ravi");
    await answerAt(table, 0, FIRST_ANSWER_MS, CORRECT_OPTION_TEXT);
    const [hostReveal] = await closeByDeadline(table);
    const returning = await connectAs(table.testServer.port);
    const ravi = table.players[1];

    const hosted = await table.host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    const rejoined = await join(returning, "Ravi", roundRoom.joinCode, ravi?.key);

    expect(hosted.ok && revealedRoundSchema.parse(hosted.round).leaderboard).toEqual(
      hostReveal?.leaderboard,
    );
    expect(rejoined.ok && revealedRoundSchema.parse(rejoined.round).leaderboard).toEqual(
      hostReveal?.leaderboard,
    );
  });
});
