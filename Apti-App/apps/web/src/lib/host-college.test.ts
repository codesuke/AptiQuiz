import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createDatabase, seedColleges } from "@aptiquiz/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const envFile = new URL("../../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

vi.mock("server-only", () => ({}));

import { requireHostCollege, resolveHostReturnTarget } from "./host-college";

const databaseUrl = process.env.DATABASE_URL;

describe("host return target", () => {
  it("accepts only the hosting entry point", () => {
    expect(resolveHostReturnTarget("/host")).toBe("/host");
  });

  it.each([
    undefined,
    "",
    "/",
    "/admin",
    "//evil.example",
    "https://evil.example/host",
    "/host/../admin",
    "/host?next=/",
  ])("ignores %s", (target) => {
    expect(resolveHostReturnTarget(target)).toBeNull();
  });
});

describe.runIf(databaseUrl)("Host College rule", () => {
  if (!databaseUrl) throw new Error("Host College test needs DATABASE_URL");
  const database = createDatabase(databaseUrl);
  const userIds: string[] = [];
  const roomIds: string[] = [];
  const questionSetIds: string[] = [];

  async function createUser(homeCollegeId?: string) {
    const id = `host-college-${randomUUID()}`;
    userIds.push(id);
    return database.user.create({
      data: { id, name: "Host Tester", email: `${id}@example.test`, homeCollegeId },
    });
  }

  async function twoColleges() {
    const [first, second] = await database.college.findMany({ take: 2, orderBy: { name: "asc" } });
    if (!first || !second) throw new Error("Seed produced fewer than two Colleges");
    return [first, second] as const;
  }

  beforeAll(async () => {
    await seedColleges(database);
  });

  afterAll(async () => {
    await database.room.deleteMany({ where: { id: { in: roomIds } } });
    await database.questionSet.deleteMany({ where: { id: { in: questionSetIds } } });
    await database.user.deleteMany({ where: { id: { in: userIds } } });
    await database.$disconnect();
  });

  it("returns the Home College for a User who has one", async () => {
    const [college] = await twoColleges();
    const user = await createUser(college.id);

    expect(await requireHostCollege(database, user.id)).toEqual({
      ok: true,
      college: { id: college.id, name: college.name },
    });
  });

  it("refuses a User without a Home College with a typed reason", async () => {
    const user = await createUser();

    expect(await requireHostCollege(database, user.id)).toEqual({
      ok: false,
      reason: "home_college_required",
    });
  });

  it("keeps the College stored on a Room when the Host later changes Home College", async () => {
    const [first, second] = await twoColleges();
    const host = await createUser(first.id);
    const questionSet = await database.questionSet.create({
      data: { ownerId: host.id, title: "Host College test set" },
    });
    questionSetIds.push(questionSet.id);

    const decision = await requireHostCollege(database, host.id);
    if (!decision.ok) throw new Error("Host with a Home College was refused");
    const room = await database.room.create({
      data: {
        joinCode: randomUUID().slice(0, 8),
        hostId: host.id,
        collegeId: decision.college.id,
        questionSetId: questionSet.id,
        questionSnapshot: [],
      },
    });
    roomIds.push(room.id);

    await database.user.update({ where: { id: host.id }, data: { homeCollegeId: second.id } });

    const stored = await database.room.findUniqueOrThrow({ where: { id: room.id } });
    expect(stored.collegeId).toBe(first.id);
    expect(await requireHostCollege(database, host.id)).toMatchObject({
      ok: true,
      college: { id: second.id },
    });
  });
});
