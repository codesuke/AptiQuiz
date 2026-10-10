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

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    options: questionOptionsSchema,
    correctOptionId: z.string().min(1),
    topic: z.string().trim().min(1).max(100),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
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
  title: z.string().trim().min(1).max(160),
  questions: z.array(questionInputSchema).min(1).max(100),
});

function requireHostId(hostId: string | null | undefined): string {
  if (!hostId) throw new Error("Sign in to manage Question Sets.");
  return hostId;
}

export async function createQuestionSet(
  db: PrismaClient,
  hostId: string | null,
  idempotencyKey: string,
  input: unknown,
) {
  const ownerId = requireHostId(hostId);
  const key = z.uuid().parse(idempotencyKey);
  const data = createQuestionSetSchema.parse(input);
  return db.questionSet.upsert({
    where: { ownerId_idempotencyKey: { ownerId, idempotencyKey: key } },
    update: {},
    create: {
      ownerId,
      idempotencyKey: key,
      title: data.title,
      questions: {
        create: data.questions.map((question, position) => ({
          position,
          text: question.text,
          options: question.options,
          correctOptionId: question.correctOptionId,
          topic: question.topic,
          difficulty: question.difficulty,
        })),
      },
    },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

export async function listQuestionSets(db: PrismaClient, hostId: string | null) {
  return db.questionSet.findMany({
    where: { ownerId: requireHostId(hostId) },
    orderBy: { updatedAt: "desc" },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}

export async function getQuestionSet(db: PrismaClient, hostId: string | null, setId: string) {
  return db.questionSet.findFirst({
    where: { id: setId, ownerId: requireHostId(hostId) },
    include: { questions: { orderBy: { position: "asc" } } },
  });
}
