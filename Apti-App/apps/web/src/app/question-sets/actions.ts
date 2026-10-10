"use server";

import {
  addQuestion,
  createQuestionSet,
  createQuestionSetSchema,
  QUESTION_OPTION_NUMBERS,
  questionInputSchema,
  reorderQuestions,
  updateQuestion,
} from "@aptiquiz/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";

function readTable(value: string) {
  const [headers, ...rows] = value
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()));
  return { headers, rows };
}

function readQuestion(formData: FormData) {
  const options = QUESTION_OPTION_NUMBERS.map((number) => ({
    id: String(number),
    text: String(formData.get(`option-${number}`) ?? "").trim(),
  })).filter((option) => option.text.length > 0);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const tableText = String(formData.get("table") ?? "").trim();
  const media = {
    ...(imageUrl ? { imageUrl } : {}),
    ...(tableText ? { table: readTable(tableText) } : {}),
  };
  return {
    text: formData.get("text"),
    options,
    correctOptionId: formData.get("correctOptionId"),
    topic: formData.get("topic"),
    difficulty: formData.get("difficulty"),
    ...(imageUrl || tableText ? { media } : {}),
  };
}

export async function createQuestionSetAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const input = {
    idempotencyKey: formData.get("idempotencyKey"),
    title: formData.get("title"),
    questions: [readQuestion(formData)],
  };
  const parsed = createQuestionSetSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the Question fields.";
    redirect(`/question-sets?error=${encodeURIComponent(message)}`);
  }

  const set = await createQuestionSet(database, session.user.id, parsed.data);
  redirect(`/question-sets/${set.id}`);
}

export async function addQuestionAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const parsed = questionInputSchema.safeParse(readQuestion(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the Question fields.";
    redirect(`/question-sets/${encodeURIComponent(setId)}?error=${encodeURIComponent(message)}`);
  }
  await addQuestion(database, session.user.id, {
    setId,
    idempotencyKey: formData.get("idempotencyKey"),
    question: parsed.data,
  });
  redirect(`/question-sets/${setId}`);
}

export async function updateQuestionAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const editPath = `/question-sets/${encodeURIComponent(setId)}/questions/${encodeURIComponent(questionId)}`;
  const parsed = questionInputSchema.safeParse(readQuestion(formData));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the Question fields.";
    redirect(`${editPath}?error=${encodeURIComponent(message)}`);
  }
  await updateQuestion(database, session.user.id, { setId, questionId, question: parsed.data });
  redirect(`/question-sets/${encodeURIComponent(setId)}`);
}

export async function reorderQuestionsAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const setId = String(formData.get("setId") ?? "");
  const questionIds = formData.getAll("questionId").map(String);
  await reorderQuestions(database, session.user.id, { setId, questionIds });
  redirect(`/question-sets/${encodeURIComponent(setId)}`);
}
