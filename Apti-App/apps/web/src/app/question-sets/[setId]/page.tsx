import { randomUUID } from "node:crypto";
import { getQuestionSet, questionOptionsSchema } from "@aptiquiz/database";
import { ArrowDown, ArrowUp, Check, Pencil } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { addQuestionAction, reorderQuestionsAction } from "../actions";
import { OPTION_LETTERS } from "../option-labels";
import { QuestionFields } from "../question-fields";
import { QuestionMedia } from "../question-media";
import { QuestionSetShell } from "../question-set-shell";
import styles from "../question-sets.module.css";

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
  questionNumber,
  setId,
}: {
  direction: "up" | "down";
  disabled: boolean;
  ids: string[];
  questionNumber: number;
  setId: string;
}) {
  return (
    <form action={reorderQuestionsAction}>
      <input name="setId" type="hidden" value={setId} />
      {ids.map((id) => (
        <input key={id} name="questionId" type="hidden" value={id} />
      ))}
      <button
        aria-label={`Move question ${questionNumber} ${direction}`}
        className={styles.control}
        disabled={disabled}
        type="submit"
      >
        {direction === "up" ? (
          <ArrowUp aria-hidden="true" size={16} />
        ) : (
          <ArrowDown aria-hidden="true" size={16} />
        )}
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
    <QuestionSetShell backHref="/question-sets" backLabel="All question sets">
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <div className={`${styles.intro} ${styles.introActions}`}>
            <div>
              <h1>{set.title}</h1>
              <div className={styles.introMeta}>
                <span>
                  {set.questions.length} {set.questions.length === 1 ? "question" : "questions"}
                </span>
                <span aria-hidden="true">·</span>
                <span className={styles.status}>{set.isStarter ? "Read only" : "Your set"}</span>
              </div>
            </div>
            <Link
              className={styles.inlineLink}
              href={`/host?questionSetId=${encodeURIComponent(set.id)}`}
            >
              Host with this set <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <section aria-label="Questions in this set">
            {set.questions.length === 0 ? (
              <p className={styles.empty}>
                No questions yet. Add the first question using the form.
              </p>
            ) : null}
            <ol className={styles.questions}>
              {set.questions.map((question, index) => (
                <li className={styles.question} key={question.id}>
                  <span aria-hidden="true" className={styles.questionNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className={styles.questionMeta}>
                      {question.topic} · {question.difficulty.toLowerCase()}
                    </p>
                    <h2>{question.text}</h2>
                    <QuestionMedia media={question.media} />
                    <ol className={styles.answers}>
                      {questionOptionsSchema.parse(question.options).map((option, optionIndex) => {
                        const isCorrect = option.id === question.correctOptionId;
                        return (
                          <li
                            className={`${styles.answer} ${isCorrect ? styles.correct : ""}`}
                            key={option.id}
                          >
                            {isCorrect ? <Check aria-label="Correct answer" size={16} /> : null}
                            <span className={styles.answerKey}>
                              {OPTION_LETTERS[optionIndex] ?? option.id}
                            </span>
                            <span>{option.text}</span>
                          </li>
                        );
                      })}
                    </ol>
                    {!set.isStarter ? (
                      <div className={styles.questionControls}>
                        <Link
                          className={styles.control}
                          href={`/question-sets/${set.id}/questions/${question.id}`}
                        >
                          <Pencil aria-hidden="true" size={14} /> Edit question
                        </Link>
                        <MoveButton
                          direction="up"
                          disabled={index === 0}
                          ids={withMoved(set.questions, index, index - 1)}
                          questionNumber={index + 1}
                          setId={set.id}
                        />
                        <MoveButton
                          direction="down"
                          disabled={index === set.questions.length - 1}
                          ids={withMoved(set.questions, index, index + 1)}
                          questionNumber={index + 1}
                          setId={set.id}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        {!set.isStarter ? (
          <section
            aria-labelledby="add-question-heading"
            className={`${styles.composer} ${styles.detailAside}`}
          >
            <h2 id="add-question-heading">Add a question</h2>
            <p>It will appear at the end of this set.</p>
            {query.error ? (
              <p className={styles.error} role="alert">
                {query.error}
              </p>
            ) : null}
            <form action={addQuestionAction} className={styles.form}>
              <input name="setId" type="hidden" value={set.id} />
              <input name="idempotencyKey" type="hidden" value={randomUUID()} />
              <QuestionFields />
              <button className={styles.primary} type="submit">
                Add question <span aria-hidden="true">↗</span>
              </button>
            </form>
          </section>
        ) : (
          <aside className={`${styles.composer} ${styles.detailAside}`}>
            <h2>Ready to play?</h2>
            <p>
              This shared starter set is ready to use in a room. Host a session and invite others to
              join.
            </p>
            <Link
              className={styles.inlineLink}
              href={`/host?questionSetId=${encodeURIComponent(set.id)}`}
            >
              Set up a room <span aria-hidden="true">↗</span>
            </Link>
          </aside>
        )}
      </div>
    </QuestionSetShell>
  );
}
