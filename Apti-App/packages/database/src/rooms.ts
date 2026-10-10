import { randomInt } from "node:crypto";
import {
  createRoomRequestSchema,
  type RoomRegistration,
  roomQuestionSchema,
} from "@aptiquiz/contracts";
import { z } from "zod";
import { Prisma, type PrismaClient } from "./index.js";
import { snapshotQuestionSet } from "./question-sets.js";

const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 6;
const MAX_JOIN_CODE_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "P2002";

const storedSnapshotSchema = z.array(roomQuestionSchema);
/** The same shape with JSON-typed media, so the parsed value is assignable to a Prisma Json column. */
const snapshotForStorageSchema = z.array(
  roomQuestionSchema.extend({ media: z.record(z.string(), z.json()).optional() }),
);

/** The Game Server needs at least one Question, so a Room for an empty set could never start. */
export class EmptyQuestionSetError extends Error {
  constructor() {
    super("Question Set has no Questions.");
    this.name = "EmptyQuestionSetError";
  }
}

export type HostedRoom = {
  readonly roomId: string;
  readonly joinCode: string;
  readonly status: "LOBBY" | "RUNNING" | "FINISHED" | "CANCELLED";
  readonly registration: RoomRegistration;
};

export function randomJoinCode(): string {
  return Array.from(
    { length: JOIN_CODE_LENGTH },
    () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)],
  ).join("");
}

const hostedRoomInclude = {
  college: { select: { id: true, name: true } },
  questionSet: { select: { title: true } },
} as const satisfies Prisma.RoomInclude;

type HostedRoomRow = Prisma.RoomGetPayload<{ include: typeof hostedRoomInclude }>;

function toHostedRoom(row: HostedRoomRow): HostedRoom {
  return {
    roomId: row.id,
    joinCode: row.joinCode,
    status: row.status,
    registration: {
      roomId: row.id,
      joinCode: row.joinCode,
      hostUserId: row.hostId,
      college: row.college,
      questionSetTitle: row.questionSet.title,
      questions: storedSnapshotSchema.parse(row.questionSnapshot),
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

async function findRoomByKey(db: PrismaClient, hostId: string, idempotencyKey: string) {
  const row = await db.room.findUnique({
    where: { hostId_idempotencyKey: { hostId, idempotencyKey } },
    include: hostedRoomInclude,
  });
  return row ? toHostedRoom(row) : null;
}

/**
 * Creates a Room with a frozen copy of the Questions. A repeated idempotency key returns the
 * original Room; a Join Code collision is retried with a fresh code. An empty Question Set
 * throws EmptyQuestionSetError and stores nothing.
 */
export async function createRoom(
  db: PrismaClient,
  hostId: string,
  input: unknown,
  collegeId: string,
  generateJoinCode: () => string = randomJoinCode,
): Promise<HostedRoom> {
  const { questionSetId, idempotencyKey } = createRoomRequestSchema.parse(input);
  const existing = await findRoomByKey(db, hostId, idempotencyKey);
  if (existing) return existing;

  const snapshot = await snapshotQuestionSet(db, hostId, questionSetId);
  const questionSnapshot = snapshotForStorageSchema.parse(snapshot.questions);
  if (questionSnapshot.length === 0) throw new EmptyQuestionSetError();

  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt += 1) {
    try {
      const row = await db.room.create({
        data: {
          joinCode: generateJoinCode(),
          hostId,
          collegeId,
          questionSetId: snapshot.questionSetId,
          idempotencyKey,
          questionSnapshot,
        },
        include: hostedRoomInclude,
      });
      return toHostedRoom(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Either a concurrent retry won the idempotency key, or the Join Code is taken.
      const raced = await findRoomByKey(db, hostId, idempotencyKey);
      if (raced) return raced;
    }
  }
  throw new Error("Could not allocate a unique Join Code.");
}

export async function getHostedRoom(
  db: PrismaClient,
  hostId: string,
  roomId: string,
): Promise<HostedRoom | null> {
  const row = await db.room.findFirst({
    where: { id: roomId, hostId },
    include: hostedRoomInclude,
  });
  return row ? toHostedRoom(row) : null;
}

export type ParticipantRecord = {
  readonly roomId: string;
  readonly collegeId: string;
  readonly userId: string | null;
  readonly displayName: string;
  readonly idempotencyKey: string;
};

async function findParticipant(db: PrismaClient, input: ParticipantRecord) {
  // findFirst: Prisma cannot address the (roomId, userId) unique key because userId is nullable.
  const identity = input.userId
    ? { userId: input.userId }
    : { idempotencyKey: input.idempotencyKey };
  return db.participant.findFirst({
    where: { roomId: input.roomId, ...identity },
    select: { id: true },
  });
}

/** One Participant per signed-in User per Room, and one per Guest idempotency key. */
export async function recordParticipant(
  db: PrismaClient,
  input: ParticipantRecord,
): Promise<{ participantId: string }> {
  const existing = await findParticipant(db, input);
  if (existing) return { participantId: existing.id };

  try {
    const created = await db.participant.create({ data: input, select: { id: true } });
    return { participantId: created.id };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findParticipant(db, input);
    if (!raced) throw error;
    return { participantId: raced.id };
  }
}

export async function markRoomStarted(db: PrismaClient, roomId: string): Promise<void> {
  await db.room.updateMany({ where: { id: roomId, status: "LOBBY" }, data: { status: "RUNNING" } });
}
