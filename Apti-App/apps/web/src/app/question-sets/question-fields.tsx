import { QUESTION_OPTION_NUMBERS } from "@aptiquiz/database";

export function QuestionFields() {
  return (
    <>
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
          {QUESTION_OPTION_NUMBERS.map((number) => (
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
          {QUESTION_OPTION_NUMBERS.map((number) => (
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
      <label className="block text-sm font-medium">
        Image URL (optional)
        <input
          className="mt-1 w-full rounded-lg border border-stone-300 p-3"
          name="imageUrl"
          placeholder="https://example.com/image.png"
          type="url"
        />
      </label>
      <label className="block text-sm font-medium">
        Table (optional)
        <textarea
          className="mt-1 min-h-24 w-full rounded-lg border border-stone-300 p-3"
          name="table"
          placeholder={"Year,Applicants\n2025,40\n2026,50"}
        />
        <span className="mt-1 block text-xs font-normal text-stone-600">
          Use one comma-separated row per line. First row is the header.
        </span>
      </label>
    </>
  );
}
