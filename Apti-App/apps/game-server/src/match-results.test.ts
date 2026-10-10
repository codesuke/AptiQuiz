import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type {
  RoomAdvanceResponse,
  RoundView,
  ServerToClientEvents,
  SocketTicketSubject,
} from "@aptiquiz/contracts";
import {
  createDatabase,
  createQuestionSet,
  createRoom,
  type HostedRoom,
  type PrismaClient,
} from "@aptiquiz/database";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseRoomStore, type DatabaseRoomStore } from "./database-room-store.js";
import type { RoomStore } from "./room-store.js";
import {
  connectAs,
  join,
  registerRoom,
  settle,
  startRoom,
  startServerWithStore,
  stopTestServer,
  type TestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import { advanceTo, optionIdFor, submit } from "./testing/round-harness.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

const TEST_TIMEOUT_MS = 60_000;
const CORRECT = "Yes";
const WRONG = "No";

const runId = randomUUID().slice(0, 8);
const id = (name: string) => `mr_${runId}_${name}`;
const hostId = id("host");
const ashaId = id("asha");
const raviId = id("ravi");
const collegeIds = {
  room: id("c_room"),
  asha: id("c_asha"),
  ravi: id("c_ravi"),
  later: id("c_new"),
};

const fourQuestionTopics = ["Math", "Logic", "Math", "Verbal"] as const;

function question(text: string, topic: string) {
  return {
    text,
    options: [
      { id: "a", text: CORRECT },
      { id: "b", text: WRONG },
    ],
    correctOptionId: "a",
    topic,
    difficulty: "EASY",
  };
}

function ticketFor(userId: string, homeCollegeId: string, emailVerified: boolean) {
  return { userId, role: "user", homeCollegeId, emailVerified } satisfies SocketTicketSubject;
}

interface Player {
  readonly name: string;
  readonly socket: TestSocket;
  readonly participantId: string;
  /** The newest Round view this player received. */
  readonly latest: () => RoundView | undefined;
}

interface Table {
  readonly server: TestServer<CountingStore>;
  readonly host: TestSocket;
  readonly hosted: HostedRoom;
  readonly roomId: string;
  readonly hostView: () => RoundView | undefined;
}

interface CountingStore extends RoomStore {
  /** Completion attempts that reached the store, failed or not. */
  readonly completionAttempts: () => number;
  failNextCompletion(): void;
}

describe.skipIf(!databaseUrl)("Room completion in PostgreSQL", () => {
  const db: PrismaClient = createDatabase(databaseUrl ?? "postgresql://unused");
  let fourQuestionSetId = "";
  let oneQuestionSetId = "";
  const stores: DatabaseRoomStore[] = [];

  beforeAll(async () => {
    await db.college.createMany({
      data: Object.entries(collegeIds).map(([key, collegeId]) => ({
        id: collegeId,
        name: `Match results ${key} ${runId}`,
        normalizedName: collegeId,
      })),
    });
    await db.user.createMany({
      data: [
        { id: hostId, name: "Host", email: `${hostId}@example.test`, emailVerified: true },
        {
          id: ashaId,
          name: "Asha",
          email: `${ashaId}@example.test`,
          emailVerified: true,
          homeCollegeId: collegeIds.asha,
        },
        {
          id: raviId,
          name: "Ravi",
          email: `${raviId}@example.test`,
          emailVerified: false,
          homeCollegeId: collegeIds.ravi,
        },
      ],
    });
    const four = await createQuestionSet(db, hostId, {
      idempotencyKey: randomUUID(),
      title: "Four topics",
      questions: fourQuestionTopics.map((topic, index) => question(`Q${index} ${topic}?`, topic)),
    });
    const one = await createQuestionSet(db, hostId, {
      idempotencyKey: randomUUID(),
      title: "One question",
      questions: [question("Only question?", "Math")],
    });
    fourQuestionSetId = four.id;
    oneQuestionSetId = one.id;
  }, TEST_TIMEOUT_MS);

  afterEach(async () => {
    await stopTestServer();
    await Promise.all(stores.splice(0).map((store) => store.close()));
  });

  afterAll(async () => {
    await db.room.deleteMany({ where: { hostId } });
    await db.questionSet.deleteMany({ where: { ownerId: hostId } });
    await db.user.deleteMany({ where: { id: { in: [hostId, ashaId, raviId] } } });
    await db.college.deleteMany({ where: { id: { in: Object.values(collegeIds) } } });
    await db.$disconnect();
  });

  function countingStore(): CountingStore {
    const real = createDatabaseRoomStore(databaseUrl ?? "");
    stores.push(real);
    let attempts = 0;
    let failures = 0;

    return {
      ...real,
      completionAttempts: () => attempts,
      failNextCompletion: () => {
        failures += 1;
      },
      completeRoom: (input) => {
        attempts += 1;

        if (failures > 0) {
          failures -= 1;
          return Promise.reject(new Error("the transaction failed"));
        }

        return real.completeRoom(input);
      },
    };
  }

  async function openTable(questionSetId: string): Promise<Table> {
    const hosted = await createRoom(
      db,
      hostId,
      { questionSetId, idempotencyKey: randomUUID() },
      collegeIds.room,
    );
    const server = await startServerWithStore(countingStore());
    expect((await registerRoom(server.port, hosted.registration)).status).toBe(200);
    const host = await connectAs(server.port, ticketFor(hostId, collegeIds.room, true));
    const hostRounds = trackRounds(host);
    await host.emitWithAck("room:host", { roomId: hosted.roomId });
    return { server, host, hosted, roomId: hosted.roomId, hostView: hostRounds };
  }

  async function seat(table: Table, name: string, ticket?: SocketTicketSubject): Promise<Player> {
    const socket = await connectAs(table.server.port, ticket);
    const latest = trackRounds(socket);
    const joined = await join(socket, name, table.hosted.joinCode);

    if (!joined.ok) {
      throw new Error(`${name} could not join: ${joined.error}`);
    }

    await settle();
    return { name, socket, participantId: joined.participant.participantId, latest };
  }

  function trackRounds(socket: TestSocket): () => RoundView | undefined {
    let latest: RoundView | undefined;
    socket.on("round:state", (view) => {
      latest = view;
    });
    return () => latest;
  }

  /** Answers the player's open Round `afterMs` after the Round opened. */
  async function answerAt(table: Table, player: Player, afterMs: number, text: string) {
    const round = player.latest();

    if (round === undefined) {
      throw new Error(`${player.name} has no Round`);
    }

    advanceTo(table.server.clock, round.startsAt + afterMs);
    const acknowledged = await submit(player.socket, round, optionIdFor(round, text));
    expect(acknowledged.ok).toBe(true);
  }

  async function closeByDeadline(table: Table) {
    const open = table.hostView();

    if (open === undefined) {
      throw new Error("no Round is open");
    }

    advanceTo(table.server.clock, open.endsAt + 1);
    table.server.deadlines.fireDue();
    await settle();
  }

  function advance(table: Table, idempotencyKey = randomUUID()): Promise<RoomAdvanceResponse> {
    return table.host.emitWithAck("room:advance", { roomId: table.roomId, idempotencyKey });
  }

  async function openNext(table: Table) {
    await expect(advance(table)).resolves.toMatchObject({ ok: true });
    await settle();
  }

  /** Plays the four-Question Room to its last reveal with the scenario the assertions rely on. */
  async function playFourQuestions(table: Table) {
    const asha = await seat(table, "Asha", ticketFor(ashaId, collegeIds.asha, true));
    // The ticket claims a verified email; the User row is the source of truth at completion.
    const ravi = await seat(table, "Ravi", ticketFor(raviId, collegeIds.ravi, true));
    const hari = await seat(table, "Hari");
    const gita = await seat(table, "Gita");

    await startRoom(table.host, table.roomId);
    await settle();
    await answerAt(table, asha, 1_000, CORRECT);
    await answerAt(table, ravi, 2_000, CORRECT);
    await answerAt(table, hari, 2_000, WRONG);
    await closeByDeadline(table);

    await openNext(table);
    await answerAt(table, asha, 500, WRONG);
    await answerAt(table, hari, 1_500, CORRECT);
    await closeByDeadline(table);

    await openNext(table);
    await answerAt(table, asha, 1_000, CORRECT);
    await closeByDeadline(table);

    await openNext(table);
    await closeByDeadline(table);

    return { asha, ravi, hari, gita };
  }

  function resultRows(roomId: string) {
    return db.matchResult.findMany({ where: { roomId }, orderBy: { rank: "asc" } });
  }

  it(
    "saves one MatchResult per joined Participant with the final metrics",
    async () => {
      const table = await openTable(fourQuestionSetId);
      const { asha, ravi, hari, gita } = await playFourQuestions(table);

      await expect(advance(table)).resolves.toMatchObject({
        ok: true,
        lobby: { phase: "FINISHED" },
        round: null,
      });

      const rows = await resultRows(table.roomId);
      expect(rows.map((row) => row.participantId)).toEqual([
        asha.participantId,
        hari.participantId,
        ravi.participantId,
        gita.participantId,
      ]);
      expect(
        rows.map(({ rank, totalScore, correctAnswers, totalAnswers, averageResponseMs }) => ({
          rank,
          totalScore,
          correctAnswers,
          totalAnswers,
          averageResponseMs,
        })),
      ).toEqual([
        { rank: 1, totalScore: 1_800, correctAnswers: 2, totalAnswers: 4, averageResponseMs: 833 },
        { rank: 2, totalScore: 850, correctAnswers: 1, totalAnswers: 4, averageResponseMs: 1_750 },
        { rank: 3, totalScore: 800, correctAnswers: 1, totalAnswers: 4, averageResponseMs: 2_000 },
        { rank: 4, totalScore: 0, correctAnswers: 0, totalAnswers: 4, averageResponseMs: null },
      ]);
      expect(rows.map((row) => row.topicStats)).toEqual([
        [
          { topic: "Math", correct: 2, total: 2 },
          { topic: "Logic", correct: 0, total: 1 },
          { topic: "Verbal", correct: 0, total: 1 },
        ],
        [
          { topic: "Math", correct: 0, total: 2 },
          { topic: "Logic", correct: 1, total: 1 },
          { topic: "Verbal", correct: 0, total: 1 },
        ],
        [
          { topic: "Math", correct: 1, total: 2 },
          { topic: "Logic", correct: 0, total: 1 },
          { topic: "Verbal", correct: 0, total: 1 },
        ],
        [
          { topic: "Math", correct: 0, total: 2 },
          { topic: "Logic", correct: 0, total: 1 },
          { topic: "Verbal", correct: 0, total: 1 },
        ],
      ]);
      expect(rows.map((row) => row.userId)).toEqual([ashaId, null, raviId, null]);
      expect(rows.some((row) => row.userId === hostId)).toBe(false);

      const room = await db.room.findUniqueOrThrow({ where: { id: table.roomId } });
      expect(room.status).toBe("FINISHED");
      expect(room.completedAt).toEqual(rows[0]?.completedAt);
      expect(new Set(rows.map((row) => row.completedAt.getTime())).size).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "keeps User, verification, and College snapshots when the User later changes",
    async () => {
      const table = await openTable(fourQuestionSetId);
      const { asha, ravi } = await playFourQuestions(table);
      await advance(table);

      const saved = await resultRows(table.roomId);
      const ashaRow = saved.find((row) => row.participantId === asha.participantId);
      const raviRow = saved.find((row) => row.participantId === ravi.participantId);
      // The ticket said Ravi was verified, but the User row said otherwise at completion.
      expect(ashaRow).toMatchObject({
        userId: ashaId,
        emailVerifiedAtCompletion: true,
        collegeId: collegeIds.asha,
      });
      expect(raviRow).toMatchObject({
        userId: raviId,
        emailVerifiedAtCompletion: false,
        collegeId: collegeIds.ravi,
      });

      await db.user.update({
        where: { id: ashaId },
        data: { emailVerified: false, homeCollegeId: collegeIds.later },
      });
      await db.user.update({ where: { id: raviId }, data: { emailVerified: true } });
      await advance(table);

      expect(await resultRows(table.roomId)).toEqual(saved);
      await db.user.update({
        where: { id: ashaId },
        data: { emailVerified: true, homeCollegeId: collegeIds.asha },
      });
      await db.user.update({ where: { id: raviId }, data: { emailVerified: false } });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "answers League queries from the saved results",
    async () => {
      const table = await openTable(fourQuestionSetId);
      const { asha } = await playFourQuestions(table);
      await advance(table);

      const verifiedInCollege = await db.matchResult.findMany({
        where: {
          roomId: table.roomId,
          collegeId: collegeIds.asha,
          emailVerifiedAtCompletion: true,
          userId: { not: null },
        },
        orderBy: { totalScore: "desc" },
        select: { userId: true, totalScore: true, completedAt: true, participantId: true },
      });
      const room = await db.room.findUniqueOrThrow({ where: { id: table.roomId } });

      expect(verifiedInCollege).toEqual([
        {
          userId: ashaId,
          totalScore: 1_800,
          completedAt: room.completedAt,
          participantId: asha.participantId,
        },
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "does not finish or announce the Room when the commit fails, and a retry completes it",
    async () => {
      const table = await openTable(oneQuestionSetId);
      const asha = await seat(table, "Asha", ticketFor(ashaId, collegeIds.asha, true));
      const announcements: Parameters<ServerToClientEvents["room:lobby"]>[0][] = [];
      asha.socket.on("room:lobby", (lobby) => announcements.push(lobby));
      await startRoom(table.host, table.roomId);
      await settle();
      await answerAt(table, asha, 1_000, CORRECT);
      await settle();
      announcements.length = 0;
      table.server.store.failNextCompletion();
      const key = randomUUID();

      await expect(advance(table, key)).resolves.toEqual({ ok: false, error: "advance_failed" });
      await settle();

      expect(announcements).toEqual([]);
      expect(await resultRows(table.roomId)).toEqual([]);
      const unfinished = await db.room.findUniqueOrThrow({ where: { id: table.roomId } });
      expect(unfinished).toMatchObject({ status: "RUNNING", completedAt: null });
      const hosted = await table.host.emitWithAck("room:host", { roomId: table.roomId });
      expect(hosted).toMatchObject({ ok: true, lobby: { phase: "QUESTION_REVEAL" } });

      await expect(advance(table, key)).resolves.toMatchObject({
        ok: true,
        lobby: { phase: "FINISHED" },
      });
      await settle();

      expect(announcements).toMatchObject([{ phase: "FINISHED" }]);
      expect(await resultRows(table.roomId)).toHaveLength(1);
      const finished = await db.room.findUniqueOrThrow({ where: { id: table.roomId } });
      expect(finished.status).toBe("FINISHED");
      expect(finished.completedAt).not.toBeNull();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "commits once for repeated and concurrent final advances",
    async () => {
      const table = await openTable(oneQuestionSetId);
      const asha = await seat(table, "Asha", ticketFor(ashaId, collegeIds.asha, true));
      await seat(table, "Guest");
      await startRoom(table.host, table.roomId);
      await settle();
      await answerAt(table, asha, 1_000, CORRECT);
      await closeByDeadline(table);
      const sameKey = randomUUID();

      const concurrent = await Promise.all([
        advance(table, sameKey),
        advance(table, sameKey),
        advance(table),
      ]);
      const firstRows = await resultRows(table.roomId);
      const replay = await advance(table, sameKey);
      const lateRetry = await advance(table);

      const finishes = concurrent.filter((response) => response.ok);
      const refusals = concurrent.filter((response) => !response.ok);
      expect(finishes).toHaveLength(2);
      expect(refusals).toEqual([{ ok: false, error: "room_finished" }]);
      expect(replay).toMatchObject({ ok: true, lobby: { phase: "FINISHED" } });
      expect(lateRetry).toEqual({ ok: false, error: "room_finished" });
      expect(table.server.store.completionAttempts()).toBe(1);
      expect(firstRows).toHaveLength(2);
      expect(await resultRows(table.roomId)).toEqual(firstRows);
    },
    TEST_TIMEOUT_MS,
  );
});
