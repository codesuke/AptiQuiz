import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./index.js";
import {
  addQuestion,
  createQuestionSet,
  getQuestionSet,
  listQuestionSets,
  reorderQuestions,
  seedStarterQuestionSet,
  snapshotQuestionSet,
  updateQuestion,
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
  }, 30_000);

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

  it("seeds one read-only starter Question Set visible to every signed-in User", async () => {
    const first = await seedStarterQuestionSet(db);
    const second = await seedStarterQuestionSet(db);
    expect(second.id).toBe(first.id);
    expect(first.ownerId).toBeNull();
    expect(first.isStarter).toBe(true);
    expect(first.questions.length).toBeGreaterThanOrEqual(3);
    expect((await listQuestionSets(db, ownerId)).filter((set) => set.id === first.id)).toHaveLength(
      1,
    );
    expect((await listQuestionSets(db, otherId)).map((set) => set.id)).toContain(first.id);
    expect(await getQuestionSet(db, otherId, first.id)).not.toBeNull();
    expect(await db.questionSet.count({ where: { isStarter: true } })).toBe(1);
    await expect(
      addQuestion(db, ownerId, {
        setId: first.id,
        idempotencyKey: randomUUID(),
        question: {
          text: "No edits",
          options: [
            { id: "a", text: "Yes" },
            { id: "b", text: "No" },
          ],
          correctOptionId: "a",
          topic: "Logic",
          difficulty: "EASY",
        },
      }),
    ).rejects.toThrow();
  }, 30_000);

  describe("editing and reordering", () => {
    const question = (text: string) => ({
      text,
      options: [
        { id: "a", text: "Yes" },
        { id: "b", text: "No" },
      ],
      correctOptionId: "a",
      topic: "Logic",
      difficulty: "EASY",
    });
    const createSet = (title: string) =>
      createQuestionSet(db, ownerId, {
        idempotencyKey: randomUUID(),
        title,
        questions: [question("One"), question("Two"), question("Three")],
      });

    it("saves an edited Question and reads it back on reopening", async () => {
      const set = await createSet("Editable");
      const target = set.questions[1];
      if (!target) throw new Error("missing seeded Question");
      await updateQuestion(db, ownerId, {
        setId: set.id,
        questionId: target.id,
        question: {
          ...question("Two, revised"),
          correctOptionId: "b",
          difficulty: "HARD",
          media: { imageUrl: "https://example.test/two.png" },
        },
      });
      const reopened = await getQuestionSet(db, ownerId, set.id);
      expect(reopened?.questions.map((q) => q.text)).toEqual(["One", "Two, revised", "Three"]);
      expect(reopened?.questions[1]).toMatchObject({
        id: target.id,
        position: 1,
        correctOptionId: "b",
        difficulty: "HARD",
        media: { imageUrl: "https://example.test/two.png" },
      });
    });

    it("clears media when an edit omits it", async () => {
      const set = await createQuestionSet(db, ownerId, {
        idempotencyKey: randomUUID(),
        title: "Media removal",
        questions: [{ ...question("Pic"), media: { imageUrl: "https://example.test/p.png" } }],
      });
      const target = set.questions[0];
      if (!target) throw new Error("missing seeded Question");
      await updateQuestion(db, ownerId, {
        setId: set.id,
        questionId: target.id,
        question: question("Pic"),
      });
      expect((await getQuestionSet(db, ownerId, set.id))?.questions[0]?.media).toBeNull();
    });

    it("reorders Questions and reads them back in the chosen order", async () => {
      const set = await createSet("Reorderable");
      const [one, two, three] = set.questions.map((q) => q.id);
      if (!one || !two || !three) throw new Error("missing seeded Questions");
      await reorderQuestions(db, ownerId, { setId: set.id, questionIds: [three, one, two] });
      const reopened = await getQuestionSet(db, ownerId, set.id);
      expect(reopened?.questions.map((q) => q.text)).toEqual(["Three", "One", "Two"]);
      expect(reopened?.questions.map((q) => q.position)).toEqual([0, 1, 2]);
    });

    it("rejects invalid edits and reorders without changing the set", async () => {
      const set = await createSet("Protected");
      const [one, two, three] = set.questions.map((q) => q.id);
      if (!one || !two || !three) throw new Error("missing seeded Questions");
      const invalidEdit = { ...question("Bad"), correctOptionId: "missing" };
      await expect(
        updateQuestion(db, ownerId, { setId: set.id, questionId: one, question: invalidEdit }),
      ).rejects.toThrow();
      for (const questionIds of [
        [one, two],
        [one, two, two],
        [one, two, "foreign"],
        [],
        [one, two, three, one],
      ]) {
        await expect(
          reorderQuestions(db, ownerId, { setId: set.id, questionIds }),
        ).rejects.toThrow();
      }
      const unchanged = await getQuestionSet(db, ownerId, set.id);
      expect(unchanged?.questions.map((q) => q.text)).toEqual(["One", "Two", "Three"]);
      expect(unchanged?.questions.map((q) => q.position)).toEqual([0, 1, 2]);
    });

    it("serialises concurrent adds and reorders without position collisions", async () => {
      const set = await createSet("Concurrent");
      const ids = set.questions.map((q) => q.id);
      await Promise.all([
        ...["Four", "Five", "Six"].map((text) =>
          addQuestion(db, ownerId, {
            setId: set.id,
            idempotencyKey: randomUUID(),
            question: question(text),
          }),
        ),
        reorderQuestions(db, ownerId, { setId: set.id, questionIds: [...ids].reverse() }),
      ]).catch((error) => {
        // A reorder racing an add may be refused as stale; it must never corrupt positions.
        expect(String(error)).toContain("Reorder must list every Question");
      });
      const positions = (await getQuestionSet(db, ownerId, set.id))?.questions.map(
        (q) => q.position,
      );
      expect(positions).toEqual(positions?.map((_, index) => index));
    });

    it("refuses another User, a Guest, a foreign Question, and the starter set", async () => {
      const set = await createSet("Private");
      const other = await createQuestionSet(db, otherId, {
        idempotencyKey: randomUUID(),
        title: "Other's",
        questions: [question("Theirs")],
      });
      const [one, two, three] = set.questions.map((q) => q.id);
      const theirs = other.questions[0]?.id;
      if (!one || !two || !three || !theirs) throw new Error("missing seeded Questions");
      await expect(
        updateQuestion(db, otherId, {
          setId: set.id,
          questionId: one,
          question: question("Hacked"),
        }),
      ).rejects.toThrow();
      await expect(
        updateQuestion(db, null, { setId: set.id, questionId: one, question: question("Hacked") }),
      ).rejects.toThrow();
      await expect(
        updateQuestion(db, ownerId, {
          setId: set.id,
          questionId: theirs,
          question: question("Hacked"),
        }),
      ).rejects.toThrow();
      await expect(
        reorderQuestions(db, otherId, { setId: set.id, questionIds: [three, two, one] }),
      ).rejects.toThrow();
      const starter = await seedStarterQuestionSet(db);
      const starterIds = starter.questions.map((q) => q.id);
      const firstStarter = starterIds[0];
      if (!firstStarter) throw new Error("missing starter Questions");
      await expect(
        updateQuestion(db, ownerId, {
          setId: starter.id,
          questionId: firstStarter,
          question: question("Hacked"),
        }),
      ).rejects.toThrow();
      await expect(
        reorderQuestions(db, ownerId, {
          setId: starter.id,
          questionIds: [...starterIds].reverse(),
        }),
      ).rejects.toThrow();
      const unchanged = await getQuestionSet(db, ownerId, set.id);
      expect(unchanged?.questions.map((q) => q.text)).toEqual(["One", "Two", "Three"]);
      expect((await getQuestionSet(db, ownerId, starter.id))?.questions.map((q) => q.id)).toEqual(
        starterIds,
      );
    });
  }, 60_000);

  describe("snapshotting for a Room", () => {
    const options = [
      { id: "a", text: "Yes" },
      { id: "b", text: "No" },
    ];
    const table = { headers: ["Year", "Count"], rows: [["2025", "2"]] };
    const makeSet = () =>
      createQuestionSet(db, ownerId, {
        idempotencyKey: randomUUID(),
        title: "Snapshot source",
        questions: [
          { text: "Plain", options, correctOptionId: "a", topic: "Logic", difficulty: "EASY" },
          {
            text: "Pic",
            options,
            correctOptionId: "b",
            topic: "Visual",
            difficulty: "MEDIUM",
            media: { imageUrl: "https://example.test/pic.png" },
          },
          {
            text: "Grid",
            options,
            correctOptionId: "a",
            topic: "Data",
            difficulty: "HARD",
            media: { table },
          },
        ],
      });

    it("copies ordered Questions with every Room-facing field", async () => {
      const set = await makeSet();
      const snapshot = await snapshotQuestionSet(db, ownerId, set.id);
      expect(snapshot.questionSetId).toBe(set.id);
      expect(snapshot.questions).toEqual([
        { text: "Plain", options, correctOptionId: "a", topic: "Logic", difficulty: "EASY" },
        {
          text: "Pic",
          options,
          correctOptionId: "b",
          topic: "Visual",
          difficulty: "MEDIUM",
          media: { imageUrl: "https://example.test/pic.png" },
        },
        {
          text: "Grid",
          options,
          correctOptionId: "a",
          topic: "Data",
          difficulty: "HARD",
          media: { table },
        },
      ]);
    });

    it("keeps earlier snapshots unchanged and lets a new snapshot reflect edits", async () => {
      const set = await makeSet();
      const [first, second, third] = set.questions.map((q) => q.id);
      if (!first || !second || !third) throw new Error("missing seeded Questions");
      const before = await snapshotQuestionSet(db, ownerId, set.id);
      const beforeCopy = structuredClone(before);
      await updateQuestion(db, ownerId, {
        setId: set.id,
        questionId: first,
        question: {
          text: "Plain, revised",
          options,
          correctOptionId: "b",
          topic: "Logic",
          difficulty: "EASY",
        },
      });
      await reorderQuestions(db, ownerId, { setId: set.id, questionIds: [third, second, first] });
      const after = await snapshotQuestionSet(db, ownerId, set.id);
      const again = await snapshotQuestionSet(db, ownerId, set.id);

      expect(before).toEqual(beforeCopy);
      expect(after.questions.map((q) => q.text)).toEqual(["Grid", "Pic", "Plain, revised"]);
      expect(again).toEqual(after);
      expect(Object.isFrozen(before)).toBe(true);
      expect(Object.isFrozen(before.questions[0])).toBe(true);
    });

    it("snapshots the starter set but refuses another User's set and a Guest", async () => {
      const starter = await seedStarterQuestionSet(db);
      const snapshot = await snapshotQuestionSet(db, otherId, starter.id);
      expect(snapshot.questions.map((q) => q.text)).toEqual(starter.questions.map((q) => q.text));
      const mine = await makeSet();
      await expect(snapshotQuestionSet(db, otherId, mine.id)).rejects.toThrow();
      await expect(snapshotQuestionSet(db, null, mine.id)).rejects.toThrow();
      await expect(snapshotQuestionSet(db, ownerId, "missing")).rejects.toThrow();
    });
  }, 60_000);
});
