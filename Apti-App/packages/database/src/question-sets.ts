import { z } from "zod";
import { Prisma, type PrismaClient } from "./index.js";

const optionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(500),
});
export const QUESTION_OPTION_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
export const questionOptionsSchema = z
  .array(optionSchema)
  .min(2)
  .max(QUESTION_OPTION_NUMBERS.length);

const imageUrlSchema = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { message: "Image URL must use HTTP or HTTPS." },
);
const tableSchema = z
  .object({
    headers: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    rows: z
      .array(z.array(z.string().trim().min(1).max(500)))
      .min(1)
      .max(30),
  })
  .refine((table) => table.rows.every((row) => row.length === table.headers.length), {
    message: "Every table row must match the header width.",
    path: ["rows"],
  });
export const questionMediaSchema = z.object({
  imageUrl: imageUrlSchema.optional(),
  table: tableSchema.optional(),
});

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    options: questionOptionsSchema,
    correctOptionId: z.string().min(1),
    topic: z.string().trim().min(1).max(100),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    media: questionMediaSchema.optional(),
  })
  .refine(
    (question) =>
      new Set(question.options.map((option) => option.id)).size === question.options.length,
    {
      message: "Option IDs must be unique.",
      path: ["options"],
    },
  )
  .refine((question) => question.options.some((option) => option.id === question.correctOptionId), {
    message: "The correct option must match an option.",
    path: ["correctOptionId"],
  });

const MAX_QUESTIONS_PER_SET = 100;

export const createQuestionSetSchema = z.object({
  idempotencyKey: z.uuid(),
  title: z.string().trim().min(1).max(160),
  questions: z.array(questionInputSchema).min(1).max(MAX_QUESTIONS_PER_SET),
});

type ValidQuestion = z.infer<typeof questionInputSchema>;

function questionFields(question: ValidQuestion) {
  return {
    text: question.text,
    options: question.options,
    correctOptionId: question.correctOptionId,
    topic: question.topic,
    difficulty: question.difficulty,
  };
}

function questionCreateData(question: ValidQuestion, position: number) {
  return {
    position,
    ...questionFields(question),
    ...(question.media ? { media: question.media } : {}),
  };
}

export class QuestionSetNotFoundError extends Error {
  constructor() {
    super("Question Set not found.");
    this.name = "QuestionSetNotFoundError";
  }
}

function requireHostId(hostId: string | null | undefined): string {
  if (!hostId) throw new Error("Sign in to manage Question Sets.");
  return hostId;
}

function readableQuestionSets(hostId: string | null) {
  return { OR: [{ ownerId: requireHostId(hostId) }, { isStarter: true, ownerId: null }] };
}

export async function createQuestionSet(db: PrismaClient, hostId: string | null, input: unknown) {
  const ownerId = requireHostId(hostId);
  const data = createQuestionSetSchema.parse(input);
  return db.questionSet.upsert({
    where: { ownerId_idempotencyKey: { ownerId, idempotencyKey: data.idempotencyKey } },
    update: {},
    create: {
      ownerId,
      idempotencyKey: data.idempotencyKey,
      title: data.title,
      questions: {
        create: data.questions.map(questionCreateData),
      },
    },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

export async function listQuestionSets(db: PrismaClient, hostId: string | null) {
  return db.questionSet.findMany({
    where: readableQuestionSets(hostId),
    orderBy: { updatedAt: "desc" },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

export async function getQuestionSet(db: PrismaClient, hostId: string | null, setId: string) {
  return db.questionSet.findFirst({
    where: {
      id: setId,
      ...readableQuestionSets(hostId),
    },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

type Transaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function requireEditableSet(tx: Transaction, ownerId: string, setId: string) {
  const set = await tx.questionSet.findFirst({ where: { id: setId, ownerId, isStarter: false } });
  if (!set) throw new QuestionSetNotFoundError();
  // Row lock serialises concurrent add, edit, and reorder so the (set, position) key cannot collide.
  await tx.$queryRaw`SELECT id FROM "QuestionSet" WHERE id = ${set.id} FOR UPDATE`;
  return set;
}

function touchSet(tx: Transaction, setId: string) {
  return tx.questionSet.update({ where: { id: setId }, data: { updatedAt: new Date() } });
}

const addQuestionSchema = z.object({
  setId: z.string().min(1),
  idempotencyKey: z.uuid(),
  question: questionInputSchema,
});

export async function addQuestion(db: PrismaClient, hostId: string | null, input: unknown) {
  const ownerId = requireHostId(hostId);
  const data = addQuestionSchema.parse(input);
  return db.$transaction(async (tx) => {
    const set = await requireEditableSet(tx, ownerId, data.setId);
    const existing = await tx.question.findUnique({
      where: {
        questionSetId_idempotencyKey: {
          questionSetId: set.id,
          idempotencyKey: data.idempotencyKey,
        },
      },
    });
    if (existing) return existing;
    const last = await tx.question.findFirst({
      where: { questionSetId: set.id },
      orderBy: { position: "desc" },
    });
    const question = await tx.question.create({
      data: {
        questionSetId: set.id,
        idempotencyKey: data.idempotencyKey,
        ...questionCreateData(data.question, (last?.position ?? -1) + 1),
      },
    });
    await touchSet(tx, set.id);
    return question;
  });
}

const updateQuestionSchema = z.object({
  setId: z.string().min(1),
  questionId: z.string().min(1),
  question: questionInputSchema,
});

export async function updateQuestion(db: PrismaClient, hostId: string | null, input: unknown) {
  const ownerId = requireHostId(hostId);
  const data = updateQuestionSchema.parse(input);
  return db.$transaction(async (tx) => {
    const set = await requireEditableSet(tx, ownerId, data.setId);
    const existing = await tx.question.findFirst({
      where: { id: data.questionId, questionSetId: set.id },
    });
    if (!existing) throw new Error("Question not found.");
    const question = await tx.question.update({
      where: { id: existing.id },
      data: { ...questionFields(data.question), media: data.question.media ?? Prisma.DbNull },
    });
    await touchSet(tx, set.id);
    return question;
  });
}

const parkedPosition = (index: number) => -(index + 1);

const reorderQuestionsSchema = z.object({
  setId: z.string().min(1),
  questionIds: z.array(z.string().min(1)).min(1).max(MAX_QUESTIONS_PER_SET),
});

export async function reorderQuestions(db: PrismaClient, hostId: string | null, input: unknown) {
  const ownerId = requireHostId(hostId);
  const data = reorderQuestionsSchema.parse(input);
  return db.$transaction(async (tx) => {
    const set = await requireEditableSet(tx, ownerId, data.setId);
    const current = await tx.question.findMany({
      where: { questionSetId: set.id },
      select: { id: true },
    });
    const currentIds = new Set(current.map((question) => question.id));
    const isPermutation =
      data.questionIds.length === currentIds.size &&
      new Set(data.questionIds).size === currentIds.size &&
      data.questionIds.every((id) => currentIds.has(id));
    if (!isPermutation) throw new Error("Reorder must list every Question in the set once.");
    // Park positions below zero first so the (set, position) unique key never collides mid-update.
    for (const [index, id] of data.questionIds.entries()) {
      await tx.question.update({ where: { id }, data: { position: parkedPosition(index) } });
    }
    for (const [index, id] of data.questionIds.entries()) {
      await tx.question.update({ where: { id }, data: { position: index } });
    }
    await touchSet(tx, set.id);
  });
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export async function snapshotQuestionSet(db: PrismaClient, hostId: string | null, setId: string) {
  const readerId = requireHostId(hostId);
  const set = await db.$transaction(
    (tx) =>
      tx.questionSet.findFirst({
        where: { id: setId, ...readableQuestionSets(readerId) },
        include: { questions: { orderBy: { position: "asc" } } },
      }),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  if (!set) throw new QuestionSetNotFoundError();
  return deepFreeze({
    questionSetId: set.id,
    title: set.title,
    questions: set.questions.map((row) => {
      const question = questionInputSchema.parse({ ...row, media: row.media ?? undefined });
      return { ...questionFields(question), ...(question.media ? { media: question.media } : {}) };
    }),
  });
}

const STARTER_SET_KEY = "c8922f1e-7bcc-4cd4-82a0-2df902d98611";
const STARTER_SET_ID = "starter-aptitude-practice";

export function seedStarterQuestionSet(db: PrismaClient) {
  const questions = z.array(questionInputSchema).parse([
    {
      text: "What is 25% of 80?",
      options: [
        { id: "a", text: "20" },
        { id: "b", text: "25" },
        { id: "c", text: "40" },
      ],
      correctOptionId: "a",
      topic: "Percentages",
      difficulty: "EASY",
    },
    {
      text: "A train travels 120 km in 2 hours. What is its average speed?",
      options: [
        { id: "a", text: "40 km/h" },
        { id: "b", text: "60 km/h" },
        { id: "c", text: "80 km/h" },
      ],
      correctOptionId: "b",
      topic: "Speed",
      difficulty: "EASY",
    },
    {
      text: "How many more applicants came on Tuesday than Monday?",
      options: [
        { id: "a", text: "5" },
        { id: "b", text: "10" },
        { id: "c", text: "20" },
      ],
      correctOptionId: "b",
      topic: "Data interpretation",
      difficulty: "MEDIUM",
      media: {
        table: {
          headers: ["Day", "Applicants"],
          rows: [
            ["Monday", "40"],
            ["Tuesday", "50"],
          ],
        },
      },
    },
  ]);
  return db.questionSet.upsert({
    where: { id: STARTER_SET_ID },
    update: {},
    create: {
      id: STARTER_SET_ID,
      ownerId: null,
      idempotencyKey: STARTER_SET_KEY,
      isStarter: true,
      title: "Starter aptitude practice",
      questions: { create: questions.map(questionCreateData) },
    },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}
