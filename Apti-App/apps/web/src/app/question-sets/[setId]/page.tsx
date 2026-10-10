import { randomUUID } from "node:crypto";
import { getQuestionSet, questionOptionsSchema } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { addQuestionAction, reorderQuestionsAction } from "../actions";
import { QuestionFields } from "../question-fields";
import { QuestionMedia } from "../question-media";

export const dynamic = "force-dynamic";

function withMoved(questions: { id: string }[], from: number, to: number) {
  const ids = questions.map((question) => question.id);
  const [moved] = ids.splice(from, 1);
  if (moved !== undefined) ids.splice(to, 0, moved);
  return ids;
}

function MoveButton({
  direction,
  disabled,
  ids,
  setId,
}: {
  direction: string;
  disabled: boolean;
  ids: string[];
  setId: string;
}) {
  return (
    <form action={reorderQuestionsAction}>
      <input name="setId" type="hidden" value={setId} />
      {ids.map((id) => (
        <input key={id} name="questionId" type="hidden" value={id} />
      ))}
      <button
        className="underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline"
        disabled={disabled}
        type="submit"
      >
        {direction}
      </button>
    </form>
  );
}

export default async function QuestionSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const { setId } = await params;
  const set = await getQuestionSet(database, session.user.id, setId);
  if (!set) notFound();
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-[#fdfbf7] px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-[#b54800] underline" href="/question-sets">
          All Question Sets
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">{set.title}</h1>
        {set.isStarter ? (
          <p className="mt-2 text-sm text-stone-600">Shared starter set · Read only</p>
        ) : null}
        <ol className="mt-8 space-y-5">
          {set.questions.map((question, index) => (
            <li className="rounded-2xl border border-stone-200 bg-white p-6" key={question.id}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b54800]">
                {question.topic} · {question.difficulty.toLowerCase()}
              </p>
              <h2 className="mt-3 text-xl font-semibold">
                {question.position + 1}. {question.text}
              </h2>
              <QuestionMedia media={question.media} />
              <ol className="mt-4 space-y-2">
                {questionOptionsSchema.parse(question.options).map((option) => (
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
              {!set.isStarter ? (
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                  <Link
                    className="text-[#b54800] underline"
                    href={`/question-sets/${set.id}/questions/${question.id}`}
                  >
                    Edit
                  </Link>
                  <MoveButton
                    direction="Move up"
                    disabled={index === 0}
                    ids={withMoved(set.questions, index, index - 1)}
                    setId={set.id}
                  />
                  <MoveButton
                    direction="Move down"
                    disabled={index === set.questions.length - 1}
                    ids={withMoved(set.questions, index, index + 1)}
                    setId={set.id}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        {!set.isStarter ? (
          <section
            aria-labelledby="add-question-heading"
            className="mt-10 rounded-2xl border border-stone-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold" id="add-question-heading">
              Add a Question
            </h2>
            {query.error ? (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
                {query.error}
              </p>
            ) : null}
            <form action={addQuestionAction} className="mt-6 space-y-4">
              <input name="setId" type="hidden" value={set.id} />
              <input name="idempotencyKey" type="hidden" value={randomUUID()} />
              <QuestionFields />
              <button
                className="rounded-xl bg-[#e65c00] px-5 py-3 font-semibold text-white hover:bg-[#cc5200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]"
                type="submit"
              >
                Add Question
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
