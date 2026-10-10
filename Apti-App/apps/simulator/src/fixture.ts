import type { PublicQuestion } from "@aptiquiz/contracts";

/** The seeded starter Question Set, as the simulator expects to meet it. */
export interface FixtureQuestion {
  text: string;
  optionTexts: readonly string[];
  correctText: string;
  /** Option id the Host sees, in the authored order. */
  hostCorrectOptionId: string;
}

export const STARTER_FIXTURE: readonly FixtureQuestion[] = [
  {
    text: "What is 25% of 80?",
    optionTexts: ["20", "25", "40"],
    correctText: "20",
    hostCorrectOptionId: "a",
  },
  {
    text: "A train travels 120 km in 2 hours. What is its average speed?",
    optionTexts: ["40 km/h", "60 km/h", "80 km/h"],
    correctText: "60 km/h",
    hostCorrectOptionId: "b",
  },
  {
    text: "How many more applicants came on Tuesday than Monday?",
    optionTexts: ["5", "10", "20"],
    correctText: "10",
    hostCorrectOptionId: "b",
  },
];

/** Returns why a delivered Question differs from the fixture, or null when it matches. */
export function fixtureMismatch(questionIndex: number, question: PublicQuestion): string | null {
  const expected = STARTER_FIXTURE[questionIndex];
  if (!expected) return `Question ${questionIndex} is outside the starter fixture`;
  if (question.text !== expected.text)
    return `Question ${questionIndex} text differs from the fixture`;
  const actual = question.options.map((option) => option.text).sort();
  const wanted = [...expected.optionTexts].sort();
  if (actual.length !== wanted.length || actual.some((text, index) => text !== wanted[index])) {
    return `Question ${questionIndex} options differ from the fixture`;
  }
  return null;
}

function optionIdByText(question: PublicQuestion, text: string): string | null {
  return question.options.find((option) => option.text === text)?.id ?? null;
}

export function correctOptionId(questionIndex: number, question: PublicQuestion): string | null {
  const expected = STARTER_FIXTURE[questionIndex];
  return expected ? optionIdByText(question, expected.correctText) : null;
}

/** Any option other than the correct one, chosen by position so the choice is reproducible. */
export function wrongOptionId(questionIndex: number, question: PublicQuestion): string | null {
  const expected = STARTER_FIXTURE[questionIndex];
  if (!expected) return null;
  return question.options.find((option) => option.text !== expected.correctText)?.id ?? null;
}
