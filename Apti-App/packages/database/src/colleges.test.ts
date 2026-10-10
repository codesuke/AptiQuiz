import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { APPROVED_COLLEGES, normalizeCollegeName, seedColleges } from "./colleges.js";
import { createDatabase } from "./index.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

describe("normalizeCollegeName", () => {
  it("maps names that differ in case, spacing, or punctuation to one value", () => {
    const variants = [
      "Indian Institute of Technology, Bombay",
      "  indian   institute of technology bombay ",
      "INDIAN INSTITUTE OF TECHNOLOGY - BOMBAY.",
    ];
    expect(new Set(variants.map(normalizeCollegeName)).size).toBe(1);
  });

  it("keeps different Colleges apart", () => {
    expect(normalizeCollegeName("IIT Bombay")).not.toBe(normalizeCollegeName("IIT Delhi"));
  });
});

describe("approved College list", () => {
  it("includes Noida Institute of Engineering and Technology", () => {
    expect(APPROVED_COLLEGES).toContain("Noida Institute of Engineering and Technology");
  });

  it("has no two entries with the same normalized name", () => {
    const normalized = APPROVED_COLLEGES.map(normalizeCollegeName);
    expect(new Set(normalized).size).toBe(normalized.length);
  });
});

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("seedColleges", () => {
  const db = createDatabase(databaseUrl ?? "x");
  afterAll(() => db.$disconnect());

  it("loads every approved College and creates no duplicates on a second run", async () => {
    await seedColleges(db);
    const first = await db.college.findMany({ orderBy: { normalizedName: "asc" } });

    await seedColleges(db);
    const second = await db.college.findMany({ orderBy: { normalizedName: "asc" } });

    expect(first.length).toBeGreaterThanOrEqual(APPROVED_COLLEGES.length);
    expect(second).toEqual(first);
    const names = new Set(first.map((college) => college.normalizedName));
    for (const name of APPROVED_COLLEGES) {
      expect(names.has(normalizeCollegeName(name))).toBe(true);
    }
  });

  it("keeps the same ID for a College across runs", async () => {
    await seedColleges(db);
    const before = await db.college.findMany({ select: { id: true, normalizedName: true } });
    await seedColleges(db);
    const after = await db.college.findMany({ select: { id: true, normalizedName: true } });
    const byName = (rows: typeof before) =>
      Object.fromEntries(rows.map((r) => [r.normalizedName, r.id]));
    expect(byName(after)).toEqual(byName(before));
  });
});
