import { getQuestionSet, questionOptionsSchema } from "@aptiquiz/database";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { updateQuestionAction } from "../../../actions";
import { QuestionFields } from "../../../question-fields";
import { QuestionSetShell } from "../../../question-set-shell";
import styles from "../../../question-sets.module.css";

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
  const options = questionOptionsSchema.parse(question.options);

  return (
    <QuestionSetShell backHref={`/question-sets/${set.id}`} backLabel="Back to set">
      <div className={styles.container}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            {set.title} / Question {String(question.position + 1).padStart(2, "0")}
          </p>
          <h1>Refine the question.</h1>
          <div className={styles.introMeta}>Make your wording clear, then save your changes.</div>
        </div>
        <div className={styles.editorGrid}>
          <div>
            {query.error ? (
              <p className={styles.error} role="alert">
                {query.error}
              </p>
            ) : null}
            <form action={updateQuestionAction}>
              <div className={styles.editorForm}>
                <input name="setId" type="hidden" value={set.id} />
                <input name="questionId" type="hidden" value={question.id} />
                <div className={styles.form}>
                  <QuestionFields question={question} />
                </div>
              </div>
              <div className={styles.editorActions}>
                <button className={styles.primary} type="submit">
                  Save question
                </button>
                <Link className={styles.inlineLink} href={`/question-sets/${set.id}`}>
                  Cancel
                </Link>
              </div>
            </form>
          </div>
          <aside className={styles.editorSide}>
            <h2>Current question</h2>
            <p>This is the saved version. Your changes appear here after you save.</p>
            <div className={styles.preview}>
              <span className={styles.previewLabel}>
                Question {String(question.position + 1).padStart(2, "0")}
              </span>
              <p className={styles.previewQuestion}>{question.text}</p>
              {options.map((option) => (
                <div className={styles.previewOption} key={option.id}>
                  <strong>{option.id}.</strong> {option.text}
                </div>
              ))}
            </div>
            <p className={styles.sideMedia}>
              Tip: keep answer options distinct so players can make a confident choice under time
              pressure.
            </p>
          </aside>
        </div>
      </div>
    </QuestionSetShell>
  );
}
