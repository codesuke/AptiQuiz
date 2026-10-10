"use server";

import {
  createQuestionSet,
  createQuestionSetSchema,
  QUESTION_OPTION_NUMBERS,
} from "@aptiquiz/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";

export async function createQuestionSetAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const options = QUESTION_OPTION_NUMBERS.map((number) => ({
    id: String(number),
    text: String(formData.get(`option-${number}`) ?? "").trim(),
  })).filter((option) => option.text.length > 0);
  const input = {
    title: formData.get("title"),
    questions: [
      {
        text: formData.get("text"),
        options,
        correctOptionId: formData.get("correctOptionId"),
        topic: formData.get("topic"),
        difficulty: formData.get("difficulty"),
      },
    ],
  };
  const parsed = createQuestionSetSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the Question fields.";
    redirect(`/question-sets?error=${encodeURIComponent(message)}`);
  }

  const set = await createQuestionSet(
    database,
    session.user.id,
    String(formData.get("idempotencyKey") ?? ""),
    parsed.data,
  );
  redirect(`/question-sets/${set.id}`);
}
