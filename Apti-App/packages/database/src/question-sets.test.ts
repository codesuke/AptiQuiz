import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./index.js";
import {
  addQuestion,
  createQuestionSet,
  getQuestionSet,
  listQuestionSets,
  seedStarterQuestionSet,
} from "./question-sets.js";

const envFile = new URL("../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("Question Set authoring", () => {
  const db = createDatabase(databaseUrl ?? "x");
  const ownerId = `question-set-test-${randomUUID()}`;
  const otherId = `question-set-test-${randomUUID()}`;
  beforeAll(async () => {
    await db.user.createMany({
      data: [
        { id: ownerId, name: "Host", email: `${ownerId}@example.test` },
        { id: otherId, name: "Other", email: `${otherId}@example.test` },
      ],
    });
  });
  afterAll(async () => {
    await db.questionSet.deleteMany({ where: { ownerId: { in: [ownerId, otherId] } } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await db.$disconnect();
  });

  it("lets a signed-in Host create and read an ordered text Question Set", async () => {
    const input = {
      idempotencyKey: randomUUID(),
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
    const created = await createQuestionSet(db, ownerId, input);
    const replay = await createQuestionSet(db, ownerId, input);

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
        createQuestionSet(db, ownerId, {
          idempotencyKey: randomUUID(),
          title: "Invalid",
          questions: [question],
        }),
      ).rejects.toThrow();
    }
    await expect(
      createQuestionSet(db, null, {
        idempotencyKey: randomUUID(),
        title: "Guest",
        questions: [validQuestion],
      }),
    ).rejects.toThrow();
    expect(await db.questionSet.count({ where: { ownerId, title: "Invalid" } })).toBe(0);
  });

  it("adds image and table Questions alongside a text Question", async () => {
    const set = await createQuestionSet(db, ownerId, {
      idempotencyKey: randomUUID(),
      title: "Mixed set",
      questions: [
        {
          text: "Text only",
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
    const base = {
      options: [
        { id: "a", text: "2" },
        { id: "b", text: "3" },
      ],
      correctOptionId: "a",
      topic: "Arithmetic",
      difficulty: "MEDIUM",
    };
    const imageInput = {
      setId: set.id,
      idempotencyKey: randomUUID(),
      question: {
        ...base,
        text: "Count the shapes",
        media: { imageUrl: "https://example.test/shapes.png" },
      },
    };
    const image = await addQuestion(db, ownerId, imageInput);
    expect((await addQuestion(db, ownerId, imageInput)).id).toBe(image.id);
    await expect(
      addQuestion(db, otherId, { ...imageInput, idempotencyKey: randomUUID() }),
    ).rejects.toThrow();
    const table = await addQuestion(db, ownerId, {
      setId: set.id,
      idempotencyKey: randomUUID(),
      question: {
        ...base,
        text: "Read the table",
        media: {
          table: {
            headers: ["Year", "Count"],
            rows: [
              ["2025", "2"],
              ["2026", "3"],
            ],
          },
        },
      },
    });
    const read = await getQuestionSet(db, ownerId, set.id);
    expect(read?.questions.map((question) => question.text)).toEqual([
      "Text only",
      "Count the shapes",
      "Read the table",
    ]);
    expect(image.media).toEqual({ imageUrl: "https://example.test/shapes.png" });
    expect(table.media).toEqual({
      table: {
        headers: ["Year", "Count"],
        rows: [
          ["2025", "2"],
          ["2026", "3"],
        ],
      },
    });
    expect(read?.questions[1]?.media).toEqual(image.media);
    expect(read?.questions[2]?.media).toEqual(table.media);
  }, 30_000);

  it("rejects malformed media and keeps the set unchanged", async () => {
    const set = await createQuestionSet(db, ownerId, {
      idempotencyKey: randomUUID(),
      title: "Media validation",
      questions: [
        {
          text: "First",
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
    const base = {
      text: "Bad media",
      options: [
        { id: "a", text: "Yes" },
        { id: "b", text: "No" },
      ],
      correctOptionId: "a",
      topic: "Logic",
      difficulty: "EASY",
    };
    for (const media of [
      { imageUrl: "javascript:alert(1)" },
      { table: { headers: ["A", "B"], rows: [["short"]] } },
    ]) {
      await expect(
        addQuestion(db, ownerId, {
          setId: set.id,
          idempotencyKey: randomUUID(),
          question: { ...base, media },
        }),
      ).rejects.toThrow();
    }
    expect((await getQuestionSet(db, ownerId, set.id))?.questions).toHaveLength(1);
  }, 30_000);

  it("seeds one starter Question Set for a Host even when requested twice", async () => {
    const first = await seedStarterQuestionSet(db, ownerId);
    const second = await seedStarterQuestionSet(db, ownerId);
    expect(second.id).toBe(first.id);
    expect(first.questions.length).toBeGreaterThanOrEqual(3);
    expect((await listQuestionSets(db, ownerId)).filter((set) => set.id === first.id)).toHaveLength(
      1,
    );
    expect(await getQuestionSet(db, otherId, first.id)).toBeNull();
  }, 30_000);
});
