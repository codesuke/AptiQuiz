import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DAY_MS,
  getCollegeLeague,
  LEAGUE_TABLE_SIZE,
  leaguePeriodAt,
  WEEK_MS,
} from "./college-league.js";
import { createDatabase } from "./index.js";
import { completeRoom } from "./match-results.js";
import { createQuestionSet } from "./question-sets.js";
import { createRoom, markRoomStarted, recordParticipant } from "./rooms.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

const TEST_TIMEOUT_MS = 60_000;
const runId = randomUUID().slice(0, 8);
const hostId = `cl_${runId}_host`;
const hostCollegeId = `cl_${runId}_hostcollege`;

// Each test owns two far-future weeks, so rows from other tests never reach its assertions.
// A random start keeps concurrent runs against the same database out of each other's weeks.
const FIRST_MONDAY = Date.UTC(2031, 2, 3);
const RANDOM_WEEK_SPAN = 20_000;
let nextWeekSlot = Math.floor(Math.random() * RANDOM_WEEK_SPAN) * 2;
function ownWeek(): Date {
  const monday = new Date(FIRST_MONDAY + nextWeekSlot * WEEK_MS);
  nextWeekSlot += 2;
  return monday;
}

type Seat = { readonly userId: string | null; readonly collegeId: string; readonly score: number };

describe("leaguePeriodAt", () => {
  it("returns the Monday-to-Monday UTC week containing the instant", () => {
    const monday = new Date("2026-10-05T00:00:00.000Z");
    const nextMonday = new Date("2026-10-12T00:00:00.000Z");

    expect(leaguePeriodAt(monday)).toEqual({ start: monday, end: nextMonday });
    expect(leaguePeriodAt(new Date("2026-10-11T23:59:59.999Z"))).toEqual({
      start: monday,
      end: nextMonday,
    });
    expect(leaguePeriodAt(nextMonday).start).toEqual(nextMonday);
    expect(leaguePeriodAt(new Date("2026-10-10T12:00:00.000Z")).start).toEqual(monday);
  });
});

describe.skipIf(!databaseUrl)("getCollegeLeague", () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  const userIds: string[] = [];
  const collegeIds: string[] = [hostCollegeId];
  let questionSetId = "";

  beforeAll(async () => {
    await db.college.create({
      data: { id: hostCollegeId, name: `Host ${runId}`, normalizedName: hostCollegeId },
    });
    await db.user.create({ data: { id: hostId, name: "Host", email: `${hostId}@example.test` } });
    const set = await createQuestionSet(db, hostId, {
      idempotencyKey: randomUUID(),
      title: "League",
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
    await db.user.deleteMany({ where: { id: { in: [hostId, ...userIds] } } });
    await db.college.deleteMany({ where: { id: { in: collegeIds } } });
    await db.$disconnect();
  });

  async function makeCollege(name: string): Promise<string> {
    const id = `cl_${runId}_c${collegeIds.length}`;
    collegeIds.push(id);
    await db.college.create({ data: { id, name: `${name} ${runId}`, normalizedName: id } });
    return id;
  }

  async function makeUser(id: string, name: string, emailVerified = true): Promise<string> {
    const userId = `cl_${runId}_${id}`;
    userIds.push(userId);
    await db.user.create({
      data: { id: userId, name, email: `${userId}@example.test`, emailVerified },
    });
    return userId;
  }

  async function playRoom(completedAt: Date, seats: readonly Seat[]) {
    const room = await createRoom(
      db,
      hostId,
      { questionSetId, idempotencyKey: randomUUID() },
      hostCollegeId,
    );
    const participantIds: string[] = [];
    for (const seat of seats) {
      const { participantId } = await recordParticipant(db, {
        id: randomUUID(),
        roomId: room.roomId,
        collegeId: seat.collegeId,
        userId: seat.userId,
        displayName: "Seat",
        idempotencyKey: randomUUID(),
        resumeTokenHash: createHash("sha256").update(randomUUID()).digest("base64url"),
      });
      participantIds.push(participantId);
    }
    await markRoomStarted(db, room.roomId);
    const results = seats.map((seat, index) => ({
      participantId: participantIds[index] ?? "",
      rank: index + 1,
      totalScore: seat.score,
      correctAnswers: 0,
      totalAnswers: 1,
      averageResponseMs: null,
      topicStats: [{ topic: "Logic", correct: 0, total: 1 }],
    }));
    await completeRoom(db, { roomId: room.roomId, completedAt, results });
    return { roomId: room.roomId, results };
  }

  const at = (monday: Date, offsetMs: number) => new Date(monday.getTime() + offsetMs);
  const standing = (league: Awaited<ReturnType<typeof getCollegeLeague>>, userId: string) =>
    league.participants.find((row) => row.userId === userId);

  it(
    "reports the requested week as the period",
    async () => {
      const monday = ownWeek();
      const league = await getCollegeLeague(db, at(monday, 3 * DAY_MS));

      expect(league.period).toEqual({ start: monday, end: at(monday, WEEK_MS) });
      expect(league.participants).toEqual([]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "sums one User's results across Rooms and lists every captured College",
    async () => {
      const monday = ownWeek();
      const alpha = await makeCollege("Alpha");
      const beta = await makeCollege("Beta");
      const ada = await makeUser("ada", "Ada");
      await playRoom(at(monday, DAY_MS), [{ userId: ada, collegeId: beta, score: 300 }]);
      await playRoom(at(monday, 2 * DAY_MS), [{ userId: ada, collegeId: alpha, score: 450 }]);

      const league = await getCollegeLeague(db, at(monday, 3 * DAY_MS));

      expect(league.participants).toEqual([
        {
          rank: 1,
          userId: ada,
          displayName: "Ada",
          totalScore: 750,
          colleges: [`Alpha ${runId}`, `Beta ${runId}`],
        },
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "excludes Guests and Users unverified at completion, and ignores later changes",
    async () => {
      const monday = ownWeek();
      const college = await makeCollege("Gamma");
      const other = await makeCollege("Delta");
      const verified = await makeUser("verified", "Verified");
      const unverified = await makeUser("unverified", "Unverified", false);
      await playRoom(at(monday, DAY_MS), [
        { userId: verified, collegeId: college, score: 100 },
        { userId: unverified, collegeId: college, score: 900 },
        { userId: null, collegeId: college, score: 800 },
      ]);
      await db.user.update({ where: { id: unverified }, data: { emailVerified: true } });
      await db.user.update({
        where: { id: verified },
        data: { emailVerified: false, homeCollegeId: other },
      });

      const league = await getCollegeLeague(db, at(monday, 2 * DAY_MS));

      expect(league.participants).toEqual([
        {
          rank: 1,
          userId: verified,
          displayName: "Verified",
          totalScore: 100,
          colleges: [`Gamma ${runId}`],
        },
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "includes Monday 00:00 UTC and Sunday's last millisecond, excludes the next Monday",
    async () => {
      const monday = ownWeek();
      const college = await makeCollege("Epsilon");
      const first = await makeUser("first", "First");
      const last = await makeUser("last", "Last");
      const next = await makeUser("next", "Next");
      const before = await makeUser("before", "Before");
      await playRoom(at(monday, 0), [{ userId: first, collegeId: college, score: 10 }]);
      await playRoom(at(monday, WEEK_MS - 1), [{ userId: last, collegeId: college, score: 20 }]);
      await playRoom(at(monday, WEEK_MS), [{ userId: next, collegeId: college, score: 30 }]);
      await playRoom(at(monday, -1), [{ userId: before, collegeId: college, score: 40 }]);

      const league = await getCollegeLeague(db, at(monday, WEEK_MS - 1));
      const nextLeague = await getCollegeLeague(db, at(monday, WEEK_MS));

      expect(league.participants.map((row) => row.userId)).toEqual([last, first]);
      expect(nextLeague.participants.map((row) => row.userId)).toEqual([next]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "shows an eligible zero score",
    async () => {
      const monday = ownWeek();
      const college = await makeCollege("Zeta");
      const zero = await makeUser("zero", "Zero");
      await playRoom(at(monday, DAY_MS), [{ userId: zero, collegeId: college, score: 0 }]);

      const league = await getCollegeLeague(db, at(monday, DAY_MS));

      expect(standing(league, zero)).toMatchObject({ rank: 1, totalScore: 0 });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "keeps the first totals when completion is retried",
    async () => {
      const monday = ownWeek();
      const college = await makeCollege("Eta");
      const retry = await makeUser("retry", "Retry");
      const { roomId, results } = await playRoom(at(monday, DAY_MS), [
        { userId: retry, collegeId: college, score: 200 },
      ]);
      await completeRoom(db, {
        roomId,
        completedAt: at(monday, 2 * DAY_MS),
        results: results.map((result) => ({ ...result, totalScore: 999 })),
      });

      const league = await getCollegeLeague(db, at(monday, 3 * DAY_MS));

      expect(league.participants).toMatchObject([{ userId: retry, totalScore: 200 }]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "limits to ten after sorting by score, then name, then id, with sequential ranks",
    async () => {
      const monday = ownWeek();
      const college = await makeCollege("Theta");
      const seats: Seat[] = [];
      const expected: string[] = [];
      // Scores 1000..: the top row; two tied pairs exercise the name and id tiebreaks.
      const specs = [
        { id: "t01", name: "Top", score: 5000 },
        { id: "t02", name: "Bea", score: 4000 },
        { id: "t03", name: "Abe", score: 4000 },
        { id: "t04b", name: "Same", score: 3000 },
        { id: "t04a", name: "Same", score: 3000 },
        ...[2900, 2800, 2700, 2600, 2500].map((score, i) => ({
          id: `t1${i}`,
          name: `Mid${i}`,
          score,
        })),
        { id: "t20", name: "Low", score: 100 },
        { id: "t21", name: "Lower", score: 0 },
      ];
      for (const spec of specs) {
        seats.push({
          userId: await makeUser(spec.id, spec.name),
          collegeId: college,
          score: spec.score,
        });
      }
      await playRoom(at(monday, DAY_MS), seats);
      expected.push(
        ...["t01", "t03", "t02", "t04a", "t04b", "t10", "t11", "t12", "t13", "t14"].map(
          (id) => `cl_${runId}_${id}`,
        ),
      );

      const league = await getCollegeLeague(db, at(monday, DAY_MS));

      expect(LEAGUE_TABLE_SIZE).toBe(10);
      expect(league.participants.map((row) => row.userId)).toEqual(expected);
      expect(league.participants.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    },
    TEST_TIMEOUT_MS,
  );

  describe("College standings", () => {
    const standingOf = (league: Awaited<ReturnType<typeof getCollegeLeague>>, id: string) =>
      league.colleges.find((row) => row.collegeId === id);

    it(
      "is empty when the week has no Counted Match",
      async () => {
        const league = await getCollegeLeague(db, at(ownWeek(), DAY_MS));

        expect(league.colleges).toEqual([]);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "sums two eligible Rooms for one College and splits a multi-College User by captured College",
      async () => {
        const monday = ownWeek();
        const alpha = await makeCollege("Alpha");
        const beta = await makeCollege("Beta");
        const ada = await makeUser("cada", "Ada");
        const bob = await makeUser("cbob", "Bob");
        await playRoom(at(monday, DAY_MS), [
          { userId: ada, collegeId: alpha, score: 300 },
          { userId: bob, collegeId: alpha, score: 50 },
        ]);
        await playRoom(at(monday, 2 * DAY_MS), [{ userId: ada, collegeId: beta, score: 450 }]);
        await playRoom(at(monday, 3 * DAY_MS), [{ userId: ada, collegeId: alpha, score: 100 }]);

        const league = await getCollegeLeague(db, at(monday, 4 * DAY_MS));

        expect(league.colleges).toEqual([
          { rank: 1, collegeId: alpha, name: `Alpha ${runId}`, totalScore: 450 },
          { rank: 2, collegeId: beta, name: `Beta ${runId}`, totalScore: 450 },
        ]);
        expect(league.participants.filter((row) => row.userId === ada)).toHaveLength(1);
        expect(standing(league, ada)?.totalScore).toBe(850);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "ignores Guests, unverified results, and later Home College or verification changes",
      async () => {
        const monday = ownWeek();
        const gamma = await makeCollege("Gamma");
        const delta = await makeCollege("Delta");
        const verified = await makeUser("cver", "Verified");
        const unverified = await makeUser("cunv", "Unverified", false);
        await playRoom(at(monday, DAY_MS), [
          { userId: verified, collegeId: gamma, score: 100 },
          { userId: unverified, collegeId: delta, score: 900 },
          { userId: null, collegeId: delta, score: 800 },
        ]);
        await db.user.update({ where: { id: unverified }, data: { emailVerified: true } });
        await db.user.update({
          where: { id: verified },
          data: { emailVerified: false, homeCollegeId: delta },
        });

        const league = await getCollegeLeague(db, at(monday, 2 * DAY_MS));

        expect(league.colleges).toEqual([
          { rank: 1, collegeId: gamma, name: `Gamma ${runId}`, totalScore: 100 },
        ]);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "counts Monday 00:00 and Sunday's last millisecond, not the next Monday or the previous Sunday",
      async () => {
        const monday = ownWeek();
        const inFirst = await makeCollege("Epsilon");
        const inLast = await makeCollege("Zeta");
        const outNext = await makeCollege("Eta");
        const outBefore = await makeCollege("Theta");
        const users = [
          await makeUser("cw1", "W1"),
          await makeUser("cw2", "W2"),
          await makeUser("cw3", "W3"),
          await makeUser("cw4", "W4"),
        ] as [string, string, string, string];
        await playRoom(at(monday, 0), [{ userId: users[0], collegeId: inFirst, score: 10 }]);
        await playRoom(at(monday, WEEK_MS - 1), [
          { userId: users[1], collegeId: inLast, score: 20 },
        ]);
        await playRoom(at(monday, WEEK_MS), [{ userId: users[2], collegeId: outNext, score: 30 }]);
        await playRoom(at(monday, -1), [{ userId: users[3], collegeId: outBefore, score: 40 }]);

        const league = await getCollegeLeague(db, at(monday, WEEK_MS - 1));

        expect(league.colleges.map((row) => row.collegeId)).toEqual([inLast, inFirst]);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "lists an eligible zero-score College with 0 points",
      async () => {
        const monday = ownWeek();
        const college = await makeCollege("Iota");
        const zero = await makeUser("czero", "Zero");
        await playRoom(at(monday, DAY_MS), [{ userId: zero, collegeId: college, score: 0 }]);

        const league = await getCollegeLeague(db, at(monday, DAY_MS));

        expect(standingOf(league, college)).toMatchObject({ rank: 1, totalScore: 0 });
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "keeps College totals when completion is retried",
      async () => {
        const monday = ownWeek();
        const college = await makeCollege("Kappa");
        const user = await makeUser("cretry", "Retry");
        const { roomId, results } = await playRoom(at(monday, DAY_MS), [
          { userId: user, collegeId: college, score: 200 },
        ]);
        await completeRoom(db, {
          roomId,
          completedAt: at(monday, 2 * DAY_MS),
          results: results.map((result) => ({ ...result, totalScore: 999 })),
        });

        const league = await getCollegeLeague(db, at(monday, 3 * DAY_MS));

        expect(league.colleges).toMatchObject([{ collegeId: college, totalScore: 200 }]);
      },
      TEST_TIMEOUT_MS,
    );

    it(
      "limits to ten after sorting by score, then name, then id, with sequential ranks",
      async () => {
        const monday = ownWeek();
        const seats: Seat[] = [];
        const expected: string[] = [];
        // Names are created out of order so id order differs from name order.
        const specs = [
          { name: "Top", score: 900 },
          { name: "Bravo", score: 500 },
          { name: "Alpha", score: 500 },
          { name: "Same", score: 400 },
          { name: "Same", score: 400 },
          ...[390, 380, 370, 360, 350, 340].map((score, i) => ({ name: `Mid${i}`, score })),
          { name: "Low", score: 10 },
        ];
        const created: { id: string; name: string; score: number }[] = [];
        for (const [index, spec] of specs.entries()) {
          const id = await makeCollege(spec.name);
          created.push({ ...spec, id });
          seats.push({
            userId: await makeUser(`ctop${index}`, `User${index}`),
            collegeId: id,
            score: spec.score,
          });
        }
        await playRoom(at(monday, DAY_MS), seats);
        const [top, bravo, alpha, sameA, sameB, ...rest] = created;
        const tied = [sameA, sameB].sort((a, b) => (a?.id ?? "").localeCompare(b?.id ?? ""));
        expected.push(
          ...[top, alpha, bravo, ...tied, ...rest.slice(0, 5)].map((college) => college?.id ?? ""),
        );

        const league = await getCollegeLeague(db, at(monday, DAY_MS));

        expect(league.colleges.map((row) => row.collegeId)).toEqual(expected);
        expect(league.colleges.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      },
      TEST_TIMEOUT_MS,
    );
  });
});
