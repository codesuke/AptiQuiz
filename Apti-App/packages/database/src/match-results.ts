import { z } from "zod";
import type { PrismaClient } from "./index.js";

const topicStatsSchema = z.array(
  z.object({ topic: z.string(), correct: z.number().int(), total: z.number().int() }),
);

export type TopicStat = {
  readonly topic: string;
  readonly correct: number;
  readonly total: number;
};

/** The final numbers of one joined Participant, as calculated by the Game Server. */
export type MatchResultInput = {
  readonly participantId: string;
  readonly rank: number;
  readonly totalScore: number;
  readonly correctAnswers: number;
  /** The Room's Question count: the accuracy denominator, counting unanswered Questions. */
  readonly totalAnswers: number;
  /** Mean Effective Response Time over accepted Answers, or null without any. */
  readonly averageResponseMs: number | null;
  readonly topicStats: readonly TopicStat[];
};

export type CompleteRoomInput = {
  readonly roomId: string;
  readonly completedAt: Date;
  readonly results: readonly MatchResultInput[];
};

/** A saved result, including the identity snapshot the database added at completion. */
export type CommittedMatchResult = MatchResultInput & {
  readonly collegeId: string;
  readonly userId: string | null;
  readonly emailVerifiedAtCompletion: boolean;
  readonly completedAt: Date;
};

/** Prisma's 5 s default is too tight for a Room of 50 results over a remote database. */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

export class RoomCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomCompletionError";
  }
}

/**
 * Saves one MatchResult per Participant and marks the Room FINISHED with its completion time,
 * all in one transaction. The Room row lock serializes attempts, so a retry or a concurrent
 * attempt re-reads the first committed results and never creates or changes a row. The
 * College is the one stored on the Participant row; verification is read from the User row now.
 */
export async function completeRoom(
  db: PrismaClient,
  input: CompleteRoomInput,
): Promise<CommittedMatchResult[]> {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ completedAt: Date | null }[]>`
      SELECT "completedAt" FROM "Room" WHERE "id" = ${input.roomId} FOR UPDATE`;
    const room = locked[0];

    if (room === undefined) {
      throw new RoomCompletionError(`Room ${input.roomId} does not exist.`);
    }

    // The first commit wins; a Room without Participants is recognised by its completion time.
    if (room.completedAt !== null) {
      return readResults(tx, input.roomId);
    }

    const participants = await tx.participant.findMany({
      where: { roomId: input.roomId, id: { in: input.results.map((r) => r.participantId) } },
      select: {
        id: true,
        collegeId: true,
        userId: true,
        user: { select: { emailVerified: true } },
      },
    });
    const byId = new Map(participants.map((participant) => [participant.id, participant]));

    const data = input.results.map((result) => {
      const participant = byId.get(result.participantId);

      if (participant === undefined) {
        throw new RoomCompletionError(`Participant ${result.participantId} is not in the Room.`);
      }

      return {
        roomId: input.roomId,
        participantId: result.participantId,
        collegeId: participant.collegeId,
        userId: participant.userId,
        emailVerifiedAtCompletion: participant.user?.emailVerified ?? false,
        rank: result.rank,
        totalScore: result.totalScore,
        correctAnswers: result.correctAnswers,
        totalAnswers: result.totalAnswers,
        averageResponseMs: result.averageResponseMs,
        topicStats: result.topicStats.map(({ topic, correct, total }) => ({
          topic,
          correct,
          total,
        })),
        completedAt: input.completedAt,
      };
    });

    await tx.matchResult.createMany({ data, skipDuplicates: true });
    await tx.room.update({
      where: { id: input.roomId },
      data: { status: "FINISHED", completedAt: input.completedAt },
    });
    return readResults(tx, input.roomId);
  }, TRANSACTION_OPTIONS);
}

type Reader = Pick<PrismaClient, "matchResult">;

async function readResults(db: Reader, roomId: string): Promise<CommittedMatchResult[]> {
  const rows = await db.matchResult.findMany({ where: { roomId }, orderBy: { rank: "asc" } });

  return rows.map((row) => ({
    participantId: row.participantId,
    collegeId: row.collegeId,
    userId: row.userId,
    emailVerifiedAtCompletion: row.emailVerifiedAtCompletion,
    rank: row.rank,
    totalScore: row.totalScore,
    correctAnswers: row.correctAnswers,
    totalAnswers: row.totalAnswers,
    averageResponseMs: row.averageResponseMs,
    topicStats: topicStatsSchema.parse(row.topicStats),
    completedAt: row.completedAt,
  }));
}
