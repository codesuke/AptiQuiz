import { z } from "zod";
import type { PrismaClient } from "./index.js";

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

export const createQuestionSetSchema = z.object({
  idempotencyKey: z.uuid(),
  title: z.string().trim().min(1).max(160),
  questions: z.array(questionInputSchema).min(1).max(100),
});

type ValidQuestion = z.infer<typeof questionInputSchema>;

function questionCreateData(question: ValidQuestion, position: number) {
  return {
    position,
    text: question.text,
    options: question.options,
    correctOptionId: question.correctOptionId,
    topic: question.topic,
    difficulty: question.difficulty,
    ...(question.media ? { media: question.media } : {}),
  };
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

const addQuestionSchema = z.object({
  setId: z.string().min(1),
  idempotencyKey: z.uuid(),
  question: questionInputSchema,
});

export async function addQuestion(db: PrismaClient, hostId: string | null, input: unknown) {
  const ownerId = requireHostId(hostId);
  const data = addQuestionSchema.parse(input);
  return db.$transaction(async (tx) => {
    const set = await tx.questionSet.findFirst({
      where: { id: data.setId, ownerId, isStarter: false },
    });
    if (!set) throw new Error("Question Set not found.");
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
    await tx.questionSet.update({ where: { id: set.id }, data: { updatedAt: new Date() } });
    return question;
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
