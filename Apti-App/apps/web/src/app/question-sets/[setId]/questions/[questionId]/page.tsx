import { getQuestionSet } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { updateQuestionAction } from "../../../actions";
import { QuestionFields } from "../../../question-fields";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string; questionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const { setId, questionId } = await params;
  const set = await getQuestionSet(database, session.user.id, setId);
  const question = set?.questions.find((candidate) => candidate.id === questionId);
  if (!set || set.isStarter || !question) notFound();
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-[#fdfbf7] px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link
          className="text-sm font-semibold text-[#b54800] underline"
          href={`/question-sets/${set.id}`}
        >
          Back to {set.title}
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Edit Question {question.position + 1}
        </h1>
        {query.error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {query.error}
          </p>
        ) : null}
        <form action={updateQuestionAction} className="mt-6 space-y-4">
          <input name="setId" type="hidden" value={set.id} />
          <input name="questionId" type="hidden" value={question.id} />
          <QuestionFields question={question} />
          <button
            className="rounded-xl bg-[#e65c00] px-5 py-3 font-semibold text-white hover:bg-[#cc5200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]"
            type="submit"
          >
            Save Question
          </button>
        </form>
      </div>
    </main>
  );
}
