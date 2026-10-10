import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { roomCodeSchema } from "@aptiquiz/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./index.js";
import {
  addQuestion,
  createQuestionSet,
  QuestionSetNotFoundError,
  seedStarterQuestionSet,
  updateQuestion,
} from "./question-sets.js";
import {
  createRoom,
  EmptyQuestionSetError,
  getHostedRoom,
  markRoomFinished,
  markRoomStarted,
  recordParticipant,
} from "./rooms.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

const TEST_TIMEOUT_MS = 30_000;

function textQuestion(text: string) {
  return {
    text,
    options: [
      { id: "a", text: "Yes" },
      { id: "b", text: "No" },
    ],
    correctOptionId: "a",
    topic: "Logic",
    difficulty: "EASY",
  };
}

function randomTokenHash() {
  return createHash("sha256").update(randomUUID()).digest("base64url");
}

function uniqueJoinCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

describe.skipIf(!databaseUrl)("Rooms", () => {
  const db = createDatabase(databaseUrl ?? "x");
  const hostId = `room-test-${randomUUID()}`;
  const otherId = `room-test-${randomUUID()}`;
  const collegeId = `room-test-college-${randomUUID()}`;
  const collegeName = "Room Test College";
  let ownedSetId = "";
  let ownedQuestionId = "";
  let starterSetId = "";

  beforeAll(async () => {
    await db.college.create({
      data: { id: collegeId, name: collegeName, normalizedName: collegeId },
    });
    await db.user.createMany({
      data: [
        { id: hostId, name: "Host", email: `${hostId}@example.test` },
        { id: otherId, name: "Other", email: `${otherId}@example.test` },
      ],
    });
    const owned = await createQuestionSet(db, hostId, {
      idempotencyKey: randomUUID(),
      title: "Room practice",
      questions: [textQuestion("Original question?")],
    });
    ownedSetId = owned.id;
    ownedQuestionId = owned.questions[0]?.id ?? "";
    starterSetId = (await seedStarterQuestionSet(db)).id;
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await db.room.deleteMany({ where: { hostId: { in: [hostId, otherId] } } });
    await db.questionSet.deleteMany({ where: { ownerId: { in: [hostId, otherId] } } });
    await db.user.deleteMany({ where: { id: { in: [hostId, otherId] } } });
    await db.college.delete({ where: { id: collegeId } });
    await db.$disconnect();
  });

  function create(questionSetId: string, idempotencyKey = randomUUID()) {
    return createRoom(db, hostId, { questionSetId, idempotencyKey }, collegeId);
  }

  it(
    "creates a Room from an owned set with Host, College, Question Set, and snapshot",
    async () => {
      const room = await create(ownedSetId);

      expect(room.status).toBe("LOBBY");
      expect(roomCodeSchema.safeParse(room.joinCode).success).toBe(true);
      expect(room.registration).toEqual({
        roomId: room.roomId,
        joinCode: room.joinCode,
        hostUserId: hostId,
        college: { id: collegeId, name: collegeName },
        questionSetTitle: "Room practice",
        questions: [expect.objectContaining({ text: "Original question?", correctOptionId: "a" })],
      });
      const stored = await db.room.findUniqueOrThrow({ where: { id: room.roomId } });
      expect(stored).toMatchObject({ hostId, collegeId, questionSetId: ownedSetId });
      expect(stored.questionSnapshot).toEqual(room.registration.questions);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "creates a Room from the starter set",
    async () => {
      const room = await create(starterSetId);

      expect(room.registration.questionSetTitle).toBe("Starter aptitude practice");
      expect(room.registration.questions.length).toBeGreaterThan(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "rejects another User's Question Set with the not-found error",
    async () => {
      const foreign = createRoom(
        db,
        otherId,
        { questionSetId: ownedSetId, idempotencyKey: randomUUID() },
        collegeId,
      );

      await expect(foreign).rejects.toBeInstanceOf(QuestionSetNotFoundError);
      expect(await db.room.count({ where: { hostId: otherId } })).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "refuses an empty Question Set without storing a Room, on every retry",
    async () => {
      const empty = await db.questionSet.create({
        data: { ownerId: hostId, title: "Empty practice" },
      });
      const key = randomUUID();

      await expect(create(empty.id, key)).rejects.toBeInstanceOf(EmptyQuestionSetError);
      await expect(create(empty.id, key)).rejects.toBeInstanceOf(EmptyQuestionSetError);
      expect(await db.room.count({ where: { questionSetId: empty.id } })).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "keeps the stored snapshot when the source set changes later",
    async () => {
      const room = await create(ownedSetId);
      await updateQuestion(db, hostId, {
        setId: ownedSetId,
        questionId: ownedQuestionId,
        question: textQuestion("Edited question?"),
      });
      await addQuestion(db, hostId, {
        setId: ownedSetId,
        idempotencyKey: randomUUID(),
        question: textQuestion("Added question?"),
      });

      const hosted = await getHostedRoom(db, hostId, room.roomId);

      expect(hosted?.registration.questions.map((question) => question.text)).toEqual([
        "Original question?",
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "returns the original Room for a repeated idempotency key, including concurrent retries",
    async () => {
      const key = randomUUID();
      const [first, second] = await Promise.all([
        create(starterSetId, key),
        create(starterSetId, key),
      ]);
      const replay = await create(starterSetId, key);

      expect(second.roomId).toBe(first.roomId);
      expect(replay.roomId).toBe(first.roomId);
      expect(replay.joinCode).toBe(first.joinCode);
      expect(await db.room.count({ where: { hostId, idempotencyKey: key } })).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "retries with a new Join Code when the generated code is taken",
    async () => {
      const taken = await create(starterSetId);
      const fresh = uniqueJoinCode();
      const codes = [taken.joinCode, fresh];

      const room = await createRoom(
        db,
        hostId,
        { questionSetId: starterSetId, idempotencyKey: randomUUID() },
        collegeId,
        () => codes.shift() ?? uniqueJoinCode(),
      );

      expect(room.joinCode).toBe(fresh);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "hides a Room from a User who does not host it",
    async () => {
      const room = await create(starterSetId);

      expect(await getHostedRoom(db, otherId, room.roomId)).toBeNull();
      expect(await getHostedRoom(db, hostId, "missing-room")).toBeNull();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "records signed-in and Guest Participants with one identity per key and per User",
    async () => {
      const room = await create(starterSetId);
      const join = (userId: string | null, idempotencyKey = randomUUID()) =>
        recordParticipant(db, {
          id: randomUUID(),
          roomId: room.roomId,
          collegeId,
          userId,
          displayName: userId ? "Signed In" : "Guest Player",
          idempotencyKey,
          resumeTokenHash: randomTokenHash(),
        });

      const member = await join(otherId);
      const sameUser = await join(otherId);
      const guestKey = randomUUID();
      const [guest, guestRetry] = await Promise.all([join(null, guestKey), join(null, guestKey)]);

      expect(sameUser.participantId).toBe(member.participantId);
      expect(guestRetry.participantId).toBe(guest.participantId);
      const rows = await db.participant.findMany({ where: { roomId: room.roomId } });
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.id === member.participantId)).toMatchObject({
        userId: otherId,
        collegeId,
      });
      expect(rows.find((row) => row.id === guest.participantId)).toMatchObject({
        userId: null,
        collegeId,
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "stores the chosen Participant id and Resume Token hash, and a retry keeps the first ones",
    async () => {
      const room = await create(starterSetId);
      const idempotencyKey = randomUUID();
      const first = {
        id: randomUUID(),
        roomId: room.roomId,
        collegeId,
        userId: null,
        displayName: "Resumable Guest",
        idempotencyKey,
        resumeTokenHash: randomTokenHash(),
      };

      const created = await recordParticipant(db, first);
      const retried = await recordParticipant(db, {
        ...first,
        id: randomUUID(),
        resumeTokenHash: randomTokenHash(),
      });

      expect(created.participantId).toBe(first.id);
      expect(retried.participantId).toBe(first.id);
      const rows = await db.participant.findMany({ where: { roomId: room.roomId } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.resumeTokenHash).toBe(first.resumeTokenHash);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "moves a Room from LOBBY to RUNNING once",
    async () => {
      const room = await create(starterSetId);

      await markRoomStarted(db, room.roomId);
      await db.room.update({ where: { id: room.roomId }, data: { status: "FINISHED" } });
      await markRoomStarted(db, room.roomId);

      const stored = await db.room.findUniqueOrThrow({ where: { id: room.roomId } });
      expect(stored.status).toBe("FINISHED");
      const fresh = await create(starterSetId);
      await markRoomStarted(db, fresh.roomId);
      expect((await getHostedRoom(db, hostId, fresh.roomId))?.status).toBe("RUNNING");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "marks only a running Room as finished",
    async () => {
      const lobbyRoom = await create(starterSetId);
      await markRoomFinished(db, lobbyRoom.roomId);
      expect((await getHostedRoom(db, hostId, lobbyRoom.roomId))?.status).toBe("LOBBY");

      await markRoomStarted(db, lobbyRoom.roomId);
      await markRoomFinished(db, lobbyRoom.roomId);
      await markRoomFinished(db, lobbyRoom.roomId);
      expect((await getHostedRoom(db, hostId, lobbyRoom.roomId))?.status).toBe("FINISHED");
    },
    TEST_TIMEOUT_MS,
  );
});
