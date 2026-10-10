import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "./index.js";
import { createQuestionSet, getQuestionSet, listQuestionSets } from "./question-sets.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("Question Set authoring", () => {
  const db = createDatabase(databaseUrl ?? "x");
  const ownerId = `question-set-test-${randomUUID()}`;
  const otherId = `question-set-test-${randomUUID()}`;
  afterAll(async () => {
    await db.questionSet.deleteMany({ where: { ownerId: { in: [ownerId, otherId] } } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.$disconnect();
  });

  it("lets a signed-in Host create and read an ordered text Question Set", async () => {
    await db.user.createMany({
      data: [
        { id: ownerId, name: "Host", email: `${ownerId}@example.test` },
        { id: otherId, name: "Other", email: `${otherId}@example.test` },
      ],
    });

    const requestKey = randomUUID();
    const input = {
      title: "Placement practice",
      questions: [
        {
          text: "What is 2 + 2?",
          options: [
            { id: "a", text: "4" },
            { id: "b", text: "5" },
          ],
          correctOptionId: "a",
          topic: "Arithmetic",
          difficulty: "EASY",
        },
        {
          text: "What is 3 + 3?",
          options: [
            { id: "a", text: "5" },
            { id: "b", text: "6" },
          ],
          correctOptionId: "b",
          topic: "Arithmetic",
          difficulty: "EASY",
        },
      ],
    };
    const created = await createQuestionSet(db, ownerId, requestKey, input);
    const replay = await createQuestionSet(db, ownerId, requestKey, input);

    expect(created.questions.map((question) => question.text)).toEqual([
      "What is 2 + 2?",
      "What is 3 + 3?",
    ]);
    expect((await getQuestionSet(db, ownerId, created.id))?.questions.map((q) => q.text)).toEqual([
      "What is 2 + 2?",
      "What is 3 + 3?",
    ]);
    expect((await listQuestionSets(db, ownerId)).map((set) => set.id)).toContain(created.id);
    expect(await getQuestionSet(db, otherId, created.id)).toBeNull();
    expect((await listQuestionSets(db, otherId)).map((set) => set.id)).not.toContain(created.id);
    expect(replay.id).toBe(created.id);
    expect(await db.questionSet.count({ where: { ownerId, title: "Placement practice" } })).toBe(1);
  });

  it("rejects invalid authoring inputs before writing a set", async () => {
    const validQuestion = {
      text: "What is 2 + 2?",
      options: [
        { id: "a", text: "4" },
        { id: "b", text: "5" },
      ],
      correctOptionId: "a",
      topic: "Arithmetic",
      difficulty: "EASY",
    };
    const invalidQuestions = [
      { ...validQuestion, options: [{ id: "a", text: "4" }] },
      {
        ...validQuestion,
        options: Array.from({ length: 7 }, (_, index) => ({
          id: String(index),
          text: String(index),
        })),
      },
      { ...validQuestion, correctOptionId: "missing" },
      { ...validQuestion, topic: "" },
      { ...validQuestion, difficulty: "" },
    ];
    for (const question of invalidQuestions) {
      await expect(
        createQuestionSet(db, ownerId, randomUUID(), { title: "Invalid", questions: [question] }),
      ).rejects.toThrow();
    }
    await expect(
      createQuestionSet(db, null, randomUUID(), { title: "Guest", questions: [validQuestion] }),
    ).rejects.toThrow();
    expect(await db.questionSet.count({ where: { ownerId, title: "Invalid" } })).toBe(0);
  });
});
