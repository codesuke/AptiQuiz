import { randomUUID } from "node:crypto";
import { listQuestionSets, seedStarterQuestionSet } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { createQuestionSetAction } from "./actions";
import { QuestionFields } from "./question-fields";

export const dynamic = "force-dynamic";

export default async function QuestionSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const starter = await seedStarterQuestionSet(database);
  const [sets, query] = await Promise.all([
    listQuestionSets(database, session.user.id),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-[#fdfbf7] px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-[#b54800] underline" href="/">
          AptiQuiz home
        </Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Question Sets</h1>
        <p className="mt-2 text-stone-600">Build a reusable set for your next Room.</p>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <section aria-labelledby="your-sets-heading">
            <h2 className="text-xl font-semibold" id="your-sets-heading">
              Your sets
            </h2>
            <div className="mt-4">
              <Link
                className="rounded-xl border border-[#e65c00] px-4 py-2 font-semibold text-[#b54800] hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-[#e65c00]"
                href={`/question-sets/${starter.id}`}
              >
                Open starter set
              </Link>
            </div>
            {sets.length === 0 ? (
              <p className="mt-4 text-stone-600">No Question Sets yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {sets.map((set) => (
                  <li key={set.id}>
                    <Link
                      className="block rounded-xl border border-stone-200 bg-white p-4 font-medium hover:border-[#e65c00] focus-visible:outline-2 focus-visible:outline-[#e65c00]"
                      href={`/question-sets/${set.id}`}
                    >
                      {set.title}
                      <span className="ml-2 text-sm font-normal text-stone-500">
                        {set.questions.length} Questions{set.isStarter ? " · Starter" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section
            aria-labelledby="new-set-heading"
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold" id="new-set-heading">
              New Question Set
            </h2>
            {query.error ? (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
                {query.error}
              </p>
            ) : null}
            <form action={createQuestionSetAction} className="mt-6 space-y-4">
              <input name="idempotencyKey" type="hidden" value={randomUUID()} />
              <label className="block text-sm font-medium">
                Set title
                <input
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  maxLength={160}
                  name="title"
                  required
                />
              </label>
              <QuestionFields />
              <button
                className="rounded-xl bg-[#e65c00] px-5 py-3 font-semibold text-white hover:bg-[#cc5200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]"
                type="submit"
              >
                Create Question Set
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
