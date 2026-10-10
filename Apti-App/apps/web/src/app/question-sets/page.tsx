import { listQuestionSets } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { createQuestionSetAction } from "./actions";

export const dynamic = "force-dynamic";
const optionNumbers = [1, 2, 3, 4, 5, 6] as const;

export default async function QuestionSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
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
                        {set.questions.length} Questions
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
              <label className="block text-sm font-medium">
                Set title
                <input
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  maxLength={160}
                  name="title"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Question text
                <textarea
                  className="mt-1 min-h-24 w-full rounded-lg border border-stone-300 p-3"
                  maxLength={4000}
                  name="text"
                  required
                />
              </label>
              <fieldset>
                <legend className="text-sm font-medium">Options (2 to 6)</legend>
                <p className="mt-1 text-xs text-stone-600">Leave unused options blank.</p>
                <div className="mt-2 grid gap-2">
                  {optionNumbers.map((number) => (
                    <label className="flex items-center gap-3 text-sm" key={number}>
                      <span className="w-5">{number}.</span>
                      <input
                        className="w-full rounded-lg border border-stone-300 p-2"
                        maxLength={500}
                        name={`option-${number}`}
                        required={number <= 2}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-medium">
                Correct option
                <select
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  name="correctOptionId"
                  required
                >
                  <option value="">Select an option</option>
                  {optionNumbers.map((number) => (
                    <option key={number} value={String(number)}>
                      Option {number}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Topic
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                    maxLength={100}
                    name="topic"
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Difficulty
                  <select
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                    name="difficulty"
                    required
                  >
                    <option value="">Select difficulty</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
              </div>
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
