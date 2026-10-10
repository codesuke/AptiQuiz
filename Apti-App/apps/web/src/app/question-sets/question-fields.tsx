import {
  QUESTION_OPTION_NUMBERS,
  questionMediaSchema,
  questionOptionsSchema,
} from "@aptiquiz/database";
import styles from "./question-sets.module.css";

export type StoredQuestion = {
  text: string;
  options: unknown;
  correctOptionId: string;
  topic: string;
  difficulty: string;
  media: unknown;
};

/** Placement-test sections; suggested so topic-wise results group consistently across sets. */
const SUGGESTED_TOPICS = ["Quantitative", "Logical", "Verbal", "Data Interpretation"] as const;
const TOPIC_SUGGESTIONS_ID = "question-topic-suggestions";

function tableToText(table: { headers: string[]; rows: string[][] } | undefined) {
  if (!table) return "";
  return [table.headers, ...table.rows].map((row) => row.join(",")).join("\n");
}

export function QuestionFields({ question }: { question?: StoredQuestion }) {
  const optionTexts = new Map(
    question
      ? questionOptionsSchema.parse(question.options).map((option) => [option.id, option.text])
      : [],
  );
  const media = question?.media ? questionMediaSchema.parse(question.media) : undefined;

  return (
    <>
      <label className={styles.field}>
        Question text
        <textarea
          className={styles.textarea}
          defaultValue={question?.text}
          maxLength={4000}
          name="text"
          placeholder="Write a clear question for your players"
          required
        />
      </label>
      <fieldset className={styles.options}>
        <legend>Answer options</legend>
        <div className={styles.optionList}>
          {QUESTION_OPTION_NUMBERS.map((number) => (
            <label className={styles.optionRow} key={number}>
              <span aria-hidden="true" className={styles.optionNumber}>
                {number}
              </span>
              <span className="sr-only">Option {number}</span>
              <input
                className={styles.input}
                defaultValue={optionTexts.get(String(number))}
                maxLength={500}
                name={`option-${number}`}
                placeholder={number > 2 ? `Option ${number} (optional)` : `Option ${number}`}
                required={number <= 2}
              />
            </label>
          ))}
        </div>
        <p className={styles.fieldHint}>Add two to six options. Leave unused options blank.</p>
      </fieldset>
      <label className={styles.field}>
        Correct option
        <select
          className={styles.select}
          defaultValue={question?.correctOptionId ?? ""}
          name="correctOptionId"
          required
        >
          <option value="">Select the correct option</option>
          {QUESTION_OPTION_NUMBERS.map((number) => (
            <option key={number} value={String(number)}>
              Option {number}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.pair}>
        <label className={styles.field}>
          Topic
          <input
            className={styles.input}
            defaultValue={question?.topic}
            list={TOPIC_SUGGESTIONS_ID}
            maxLength={100}
            name="topic"
            placeholder="e.g. Quantitative"
            required
          />
          <datalist id={TOPIC_SUGGESTIONS_ID}>
            {SUGGESTED_TOPICS.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </label>
        <label className={styles.field}>
          Difficulty
          <select
            className={styles.select}
            defaultValue={question?.difficulty ?? ""}
            name="difficulty"
            required
          >
            <option value="">Choose difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
      </div>
      <details className={styles.mediaDisclosure} open={Boolean(media?.imageUrl || media?.table)}>
        <summary>Add image or data table (optional)</summary>
        <div className={styles.mediaBody}>
          <label className={styles.field}>
            Image URL
            <input
              className={styles.input}
              defaultValue={media?.imageUrl}
              name="imageUrl"
              placeholder="https://example.com/image.png"
              type="url"
            />
          </label>
          <label className={styles.field}>
            Data table
            <textarea
              className={styles.textarea}
              defaultValue={tableToText(media?.table)}
              name="table"
              placeholder={"Year,Applicants\n2025,40\n2026,50"}
            />
            <span className={styles.fieldHint}>
              Use one comma-separated row per line. The first row is the header.
            </span>
          </label>
        </div>
      </details>
    </>
  );
}
