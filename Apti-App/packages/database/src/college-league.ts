import { z } from "zod";
import type { PrismaClient } from "./index.js";

/** The League Period: Monday 00:00 UTC (inclusive) to the next Monday 00:00 UTC (exclusive). */
export type LeaguePeriod = {
  readonly start: Date;
  readonly end: Date;
};

export type ParticipantStanding = {
  /** Sequential position after ordering by score desc, display name asc, user id asc. */
  readonly rank: number;
  readonly userId: string;
  readonly displayName: string;
  readonly totalScore: number;
  /** Distinct College names captured by this User's counted results, sorted by name. */
  readonly colleges: readonly string[];
};

export type CollegeStanding = {
  /** Sequential position after ordering by score desc, College name asc, College id asc. */
  readonly rank: number;
  readonly collegeId: string;
  readonly name: string;
  readonly totalScore: number;
};

export type CollegeLeague = {
  readonly period: LeaguePeriod;
  /** At most 10 rows. */
  readonly participants: readonly ParticipantStanding[];
  /** At most 10 rows. */
  readonly colleges: readonly CollegeStanding[];
};

export const LEAGUE_TABLE_SIZE = 10;

export const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
export const WEEK_MS = DAYS_PER_WEEK * DAY_MS;
const MONDAY_UTC_DAY_OFFSET = 6;

/** The League Period that contains `now`, in UTC. */
export function leaguePeriodAt(now: Date): LeaguePeriod {
  const startOfDay = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const daysSinceMonday = (now.getUTCDay() + MONDAY_UTC_DAY_OFFSET) % DAYS_PER_WEEK;
  const start = new Date(startOfDay - daysSinceMonday * DAY_MS);

  return { start, end: new Date(start.getTime() + WEEK_MS) };
}

const participantRowsSchema = z.array(
  z.object({
    userId: z.string(),
    displayName: z.string(),
    totalScore: z.number().int().nonnegative(),
    colleges: z.array(z.string()),
  }),
);

const collegeRowsSchema = z.array(
  z.object({
    collegeId: z.string(),
    name: z.string(),
    totalScore: z.number().int().nonnegative(),
  }),
);

/**
 * The weekly College League over persisted completed MatchResults. A Counted Match has a
 * non-null User id and a verification status captured as true at completion. Ordering uses the
 * "C" collation so ties break the same way on every database server.
 */
export async function getCollegeLeague(db: PrismaClient, now: Date): Promise<CollegeLeague> {
  const period = leaguePeriodAt(now);
  const [participantRows, collegeRows] = await Promise.all([
    queryParticipants(db, period),
    queryColleges(db, period),
  ]);

  return {
    period,
    participants: participantRows.map((row, index) => ({ ...row, rank: index + 1 })),
    colleges: collegeRows.map((row, index) => ({ ...row, rank: index + 1 })),
  };
}

async function queryParticipants(db: PrismaClient, period: LeaguePeriod) {
  const rows = await db.$queryRaw`
    SELECT
      m."userId" AS "userId",
      u."name" AS "displayName",
      SUM(m."totalScore")::int AS "totalScore",
      ARRAY_AGG(DISTINCT c."name" COLLATE "C" ORDER BY c."name" COLLATE "C") AS "colleges"
    FROM "MatchResult" m
    JOIN "User" u ON u."id" = m."userId"
    JOIN "College" c ON c."id" = m."collegeId"
    WHERE m."userId" IS NOT NULL
      AND m."emailVerifiedAtCompletion" = true
      AND m."completedAt" >= ${period.start}
      AND m."completedAt" < ${period.end}
    GROUP BY m."userId", u."name"
    ORDER BY SUM(m."totalScore") DESC, u."name" COLLATE "C" ASC, m."userId" COLLATE "C" ASC
    LIMIT ${LEAGUE_TABLE_SIZE}`;

  return participantRowsSchema.parse(rows);
}

async function queryColleges(db: PrismaClient, period: LeaguePeriod) {
  const rows = await db.$queryRaw`
    SELECT
      c."id" AS "collegeId",
      c."name" AS "name",
      SUM(m."totalScore")::int AS "totalScore"
    FROM "MatchResult" m
    JOIN "College" c ON c."id" = m."collegeId"
    WHERE m."userId" IS NOT NULL
      AND m."emailVerifiedAtCompletion" = true
      AND m."completedAt" >= ${period.start}
      AND m."completedAt" < ${period.end}
    GROUP BY c."id", c."name"
    ORDER BY SUM(m."totalScore") DESC, c."name" COLLATE "C" ASC, c."id" COLLATE "C" ASC
    LIMIT ${LEAGUE_TABLE_SIZE}`;

  return collegeRowsSchema.parse(rows);
}
