import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createDatabase, seedColleges } from "@aptiquiz/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const envFile = new URL("../../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

vi.mock("server-only", () => ({}));

import { createHomeCollegeHandlers, getHomeCollege } from "./home-college";

const databaseUrl = process.env.DATABASE_URL;

type SessionAccess = Awaited<
  ReturnType<Parameters<typeof createHomeCollegeHandlers>[0]["getSessionAccess"]>
>;

describe.runIf(databaseUrl)("Home College", () => {
  if (!databaseUrl) throw new Error("Home College test needs DATABASE_URL");
  const database = createDatabase(databaseUrl);
  const createdIds: string[] = [];
  let access: SessionAccess = { kind: "guest" };
  const handlers = createHomeCollegeHandlers({
    database,
    getSessionAccess: async () => access,
  });

  async function createUser(suspended = false) {
    const id = `home-college-${randomUUID()}`;
    createdIds.push(id);
    return database.user.create({
      data: { id, name: "College Tester", email: `${id}@example.test`, suspended },
    });
  }

  function search(query: string) {
    return handlers.GET(
      new Request(`http://localhost:3000/api/colleges?q=${encodeURIComponent(query)}`),
    );
  }

  function choose(body: unknown) {
    return handlers.PUT(
      new Request("http://localhost:3000/api/home-college", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "PUT",
      }),
    );
  }

  function signInAs(user: { id: string }) {
    access = { kind: "active", user: { id: user.id } };
  }

  beforeAll(async () => {
    await seedColleges(database);
  });

  afterAll(async () => {
    await database.user.deleteMany({ where: { id: { in: createdIds } } });
    await database.$disconnect();
  });

  it("finds a seeded College by words in any order, ignoring case and punctuation", async () => {
    signInAs(await createUser());

    const response = await search("BOMBAY, technology");
    const { colleges } = (await response.json()) as { colleges: { id: string; name: string }[] };

    expect(response.status).toBe(200);
    expect(colleges.map((college) => college.name)).toContain(
      "Indian Institute of Technology Bombay",
    );
  });

  it("sets a Home College, then replaces it so the User keeps only one", async () => {
    const user = await createUser();
    signInAs(user);
    const [first, second] = await database.college.findMany({ take: 2, orderBy: { name: "asc" } });
    if (!first || !second) throw new Error("Seed produced fewer than two Colleges");

    expect((await choose({ collegeId: first.id })).status).toBe(200);
    expect(await getHomeCollege(database, user.id)).toEqual({ id: first.id, name: first.name });

    expect((await choose({ collegeId: second.id })).status).toBe(200);
    expect(await getHomeCollege(database, user.id)).toEqual({ id: second.id, name: second.name });
  });

  it("returns no Home College for a User who has not chosen one", async () => {
    const user = await createUser();

    expect(await getHomeCollege(database, user.id)).toBeNull();
  });

  it("rejects a College that is not in the approved list and malformed input", async () => {
    const user = await createUser();
    signInAs(user);

    expect((await choose({ collegeId: "college_does-not-exist" })).status).toBe(404);
    expect((await choose({ collegeId: 42 })).status).toBe(400);
    expect((await choose("not an object")).status).toBe(400);
    expect(await getHomeCollege(database, user.id)).toBeNull();
  });

  it("rejects a Guest and a suspended User for search and for choosing", async () => {
    const college = await database.college.findFirstOrThrow();
    const suspendedUser = await createUser(true);

    access = { kind: "guest" };
    expect((await search("technology")).status).toBe(401);
    expect((await choose({ collegeId: college.id })).status).toBe(401);

    access = { kind: "suspended" };
    expect((await search("technology")).status).toBe(403);
    expect((await choose({ collegeId: college.id })).status).toBe(403);
    expect(await getHomeCollege(database, suspendedUser.id)).toBeNull();
  });
});
