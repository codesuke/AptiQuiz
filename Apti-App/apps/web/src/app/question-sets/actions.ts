"use server";

import { createQuestionSet, createQuestionSetSchema } from "@aptiquiz/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";

export async function createQuestionSetAction(formData: FormData) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const options = Array.from({ length: 6 }, (_, index) => ({
    id: String(index + 1),
    text: String(formData.get(`option-${index + 1}`) ?? "").trim(),
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

  const set = await createQuestionSet(database, session.user.id, parsed.data);
  redirect(`/question-sets/${set.id}`);
}
