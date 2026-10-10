import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./index.js";
import { completeRoom, type MatchResultInput, RoomCompletionError } from "./match-results.js";
import { createQuestionSet } from "./question-sets.js";
import { createRoom, markRoomStarted, recordParticipant } from "./rooms.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

const TEST_TIMEOUT_MS = 60_000;
const runId = randomUUID().slice(0, 8);
const hostId = `mrdb_${runId}_host`;
const userId = `mrdb_${runId}_user`;
const collegeId = `mrdb_${runId}_college`;
const participantCollegeId = `mrdb_${runId}_other`;

describe.skipIf(!databaseUrl)("completeRoom", () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  let questionSetId = "";

  beforeAll(async () => {
    await db.college.createMany({
      data: [
        { id: collegeId, name: `Room ${runId}`, normalizedName: collegeId },
        { id: participantCollegeId, name: `Other ${runId}`, normalizedName: participantCollegeId },
      ],
    });
    await db.user.createMany({
      data: [
        { id: hostId, name: "Host", email: `${hostId}@example.test` },
        { id: userId, name: "User", email: `${userId}@example.test`, emailVerified: true },
      ],
    });
    const set = await createQuestionSet(db, hostId, {
      idempotencyKey: randomUUID(),
      title: "Completion",
      questions: [
        {
          text: "Q?",
          options: [
            { id: "a", text: "Yes" },
            { id: "b", text: "No" },
          ],
          correctOptionId: "a",
          topic: "Logic",
          difficulty: "EASY",
        },
      ],
    });
    questionSetId = set.id;
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await db.room.deleteMany({ where: { hostId } });
    await db.questionSet.deleteMany({ where: { ownerId: hostId } });
    await db.user.deleteMany({ where: { id: { in: [hostId, userId] } } });
    await db.college.deleteMany({ where: { id: { in: [collegeId, participantCollegeId] } } });
    await db.$disconnect();
  });

  async function runningRoomWithParticipants() {
    const room = await createRoom(
      db,
      hostId,
      { questionSetId, idempotencyKey: randomUUID() },
      collegeId,
    );
    const signedIn = await join(room.roomId, userId, "Signed In");
    const guest = await join(room.roomId, null, "Guest");
    await markRoomStarted(db, room.roomId);
    return { roomId: room.roomId, signedIn, guest };
  }

  async function join(roomId: string, user: string | null, displayName: string) {
    const { participantId } = await recordParticipant(db, {
      id: randomUUID(),
      roomId,
      collegeId: participantCollegeId,
      userId: user,
      displayName,
      idempotencyKey: randomUUID(),
      resumeTokenHash: createHash("sha256").update(randomUUID()).digest("base64url"),
    });
    return participantId;
  }

  function result(participantId: string, rank: number, totalScore: number): MatchResultInput {
    return {
      participantId,
      rank,
      totalScore,
      correctAnswers: rank === 1 ? 1 : 0,
      totalAnswers: 1,
      averageResponseMs: rank === 1 ? 1_200 : null,
      topicStats: [{ topic: "Logic", correct: rank === 1 ? 1 : 0, total: 1 }],
    };
  }

  it(
    "commits results with the Participant College and current verification, and finishes the Room",
    async () => {
      const { roomId, signedIn, guest } = await runningRoomWithParticipants();
      const completedAt = new Date("2026-10-10T12:00:00.000Z");

      const committed = await completeRoom(db, {
        roomId,
        completedAt,
        results: [result(guest, 2, 0), result(signedIn, 1, 900)],
      });

      expect(committed).toMatchObject([
        {
          participantId: signedIn,
          rank: 1,
          userId,
          emailVerifiedAtCompletion: true,
          collegeId: participantCollegeId,
          completedAt,
        },
        {
          participantId: guest,
          rank: 2,
          userId: null,
          emailVerifiedAtCompletion: false,
          averageResponseMs: null,
        },
      ]);
      const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
      expect(room).toMatchObject({ status: "FINISHED", completedAt });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "returns the first results for a retry with different data and leaves rows untouched",
    async () => {
      const { roomId, signedIn, guest } = await runningRoomWithParticipants();
      const first = await completeRoom(db, {
        roomId,
        completedAt: new Date("2026-10-10T12:00:00.000Z"),
        results: [result(signedIn, 1, 900), result(guest, 2, 0)],
      });
      const before = await db.matchResult.findMany({ where: { roomId }, orderBy: { rank: "asc" } });

      const retry = await completeRoom(db, {
        roomId,
        completedAt: new Date("2026-10-10T13:00:00.000Z"),
        results: [result(signedIn, 2, 5), result(guest, 1, 999)],
      });

      expect(retry).toEqual(first);
      expect(
        await db.matchResult.findMany({ where: { roomId }, orderBy: { rank: "asc" } }),
      ).toEqual(before);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "leaves one row per Participant when attempts run concurrently",
    async () => {
      const { roomId, signedIn, guest } = await runningRoomWithParticipants();

      const attempts = await Promise.all(
        [1, 2, 3, 4].map((attempt) =>
          completeRoom(db, {
            roomId,
            completedAt: new Date(Date.UTC(2026, 9, 10, 12, attempt)),
            results: [result(signedIn, 1, 100 * attempt), result(guest, 2, 0)],
          }),
        ),
      );

      expect(await db.matchResult.count({ where: { roomId } })).toBe(2);
      for (const attempt of attempts) {
        expect(attempt).toEqual(attempts[0]);
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "saves nothing and keeps the Room running when a result names a stranger",
    async () => {
      const { roomId, signedIn } = await runningRoomWithParticipants();
      const stranger = await runningRoomWithParticipants();

      await expect(
        completeRoom(db, {
          roomId,
          completedAt: new Date(),
          results: [result(signedIn, 1, 900), result(stranger.guest, 2, 0)],
        }),
      ).rejects.toBeInstanceOf(RoomCompletionError);

      expect(await db.matchResult.count({ where: { roomId } })).toBe(0);
      const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
      expect(room).toMatchObject({ status: "RUNNING", completedAt: null });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "completes a Room without Participants once",
    async () => {
      const room = await createRoom(
        db,
        hostId,
        { questionSetId, idempotencyKey: randomUUID() },
        collegeId,
      );
      const completedAt = new Date("2026-10-10T12:00:00.000Z");

      await expect(
        completeRoom(db, { roomId: room.roomId, completedAt, results: [] }),
      ).resolves.toEqual([]);
      await completeRoom(db, { roomId: room.roomId, completedAt: new Date(), results: [] });

      const stored = await db.room.findUniqueOrThrow({ where: { id: room.roomId } });
      expect(stored).toMatchObject({ status: "FINISHED", completedAt });
    },
    TEST_TIMEOUT_MS,
  );
});
