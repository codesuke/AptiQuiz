import { describe, expect, it } from "vitest";
import { initialQuestionSetId } from "./initial-question-set";

const sets = [
  { id: "starter", questionCount: 3 },
  { id: "owned", questionCount: 2 },
  { id: "empty", questionCount: 0 },
];

describe("hosting from a Question Set", () => {
  it("preselects a requested usable set, but never selects an empty or unavailable one", () => {
    expect(initialQuestionSetId(sets, "owned")).toBe("owned");
    expect(initialQuestionSetId(sets, "empty")).toBe("starter");
    expect(initialQuestionSetId(sets, "foreign")).toBe("starter");
    expect(initialQuestionSetId([], "owned")).toBe("");
  });
});
