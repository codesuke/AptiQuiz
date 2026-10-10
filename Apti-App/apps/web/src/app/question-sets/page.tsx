import { randomUUID } from "node:crypto";
import { listQuestionSets, seedStarterQuestionSet } from "@aptiquiz/database";
import { ArrowUpRight, BookOpen, ChevronRight, Layers3 } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { createQuestionSetAction } from "./actions";
import { QuestionFields } from "./question-fields";
import { QuestionSetShell } from "./question-set-shell";
import styles from "./question-sets.module.css";

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
  const ownedSets = sets.filter((set) => !set.isStarter);

  return (
    <QuestionSetShell backHref="/" backLabel="Back to home">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Your authoring workspace</p>
          <h1>Question sets</h1>
          <p>Build once. Play together.</p>
        </div>
      </section>
      <div className={`${styles.container} ${styles.workGrid}`}>
        <section aria-labelledby="your-sets-heading">
          <div className={styles.sectionHead}>
            <h2 id="your-sets-heading">Your library</h2>
            <span className={styles.count}>
              {ownedSets.length} {ownedSets.length === 1 ? "set" : "sets"} created
            </span>
          </div>
          <Link className={styles.starterRow} href={`/question-sets/${starter.id}`}>
            <span className={styles.starterIcon}>
              <BookOpen aria-hidden="true" size={26} />
            </span>
            <span className={styles.starterInfo}>
              <strong>{starter.title}</strong>
              <span>A shared set to get you started</span>
            </span>
            <span className={styles.starterMeta}>{starter.questions.length} questions</span>
            <ChevronRight aria-hidden="true" className={styles.rowArrow} size={21} />
          </Link>
          {ownedSets.length === 0 ? (
            <p className={styles.empty}>
              Your own sets will appear here. Create one to start building a room your way.
            </p>
          ) : (
            <ul>
              {ownedSets.map((set) => (
                <li key={set.id}>
                  <Link className={styles.setRow} href={`/question-sets/${set.id}`}>
                    <span className={styles.setIcon}>
                      <Layers3 aria-hidden="true" size={25} />
                    </span>
                    <span className={styles.setInfo}>
                      <strong>{set.title}</strong>
                      <span>Your question set</span>
                    </span>
                    <span className={styles.setMeta}>{set.questions.length} questions</span>
                    <ChevronRight aria-hidden="true" className={styles.rowArrow} size={20} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="new-set-heading" className={styles.composer}>
          <h2 id="new-set-heading">Create a set</h2>
          <p>Start with a question. You can add more as you go.</p>
          {query.error ? (
            <p className={styles.error} role="alert">
              {query.error}
            </p>
          ) : null}
          <form action={createQuestionSetAction} className={styles.form}>
            <input name="idempotencyKey" type="hidden" value={randomUUID()} />
            <label className={styles.field}>
              Set title
              <input
                className={styles.input}
                maxLength={160}
                name="title"
                placeholder="e.g. Placement practice"
                required
              />
            </label>
            <QuestionFields />
            <button className={styles.primary} type="submit">
              Create question set <ArrowUpRight aria-hidden="true" size={17} />
            </button>
          </form>
        </section>
      </div>
    </QuestionSetShell>
  );
}
