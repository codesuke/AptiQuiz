import { getQuestionSet } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function QuestionSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const { setId } = await params;
  const set = await getQuestionSet(database, session.user.id, setId);
  if (!set) notFound();

  return (
    <main className="min-h-screen bg-[#fdfbf7] px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-[#b54800] underline" href="/question-sets">
          All Question Sets
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">{set.title}</h1>
        <ol className="mt-8 space-y-5">
          {set.questions.map((question) => (
            <li className="rounded-2xl border border-stone-200 bg-white p-6" key={question.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b54800]">
                {question.topic} · {question.difficulty.toLowerCase()}
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {question.position + 1}. {question.text}
              </h2>
              <ol className="mt-4 space-y-2">
                {(question.options as Array<{ id: string; text: string }>).map((option) => (
                  <li
                    className={
                      option.id === question.correctOptionId
                        ? "font-semibold text-green-800"
                        : "text-stone-700"
                    }
                    key={option.id}
                  >
                    {option.text}
                    {option.id === question.correctOptionId ? " · Correct" : ""}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
