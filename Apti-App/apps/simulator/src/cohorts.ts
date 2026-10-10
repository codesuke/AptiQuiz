export type Cohort = "late" | "correct" | "wrong" | "duplicate" | "replay";

/** Order matters: small diagnostic runs still meet the cases that prove the most. */
const COHORT_ORDER: readonly Cohort[] = ["late", "correct", "wrong", "duplicate", "replay"];

/** The first Round stays open to its deadline because the late cohort never answers early. */
export const LATE_ROUND_INDEX = 0;

export function cohortOf(participantNumber: number): Cohort {
  return COHORT_ORDER[(participantNumber - 1) % COHORT_ORDER.length] ?? "correct";
}

export type RoundPlan =
  | { kind: "answer"; choice: "correct" | "wrong"; extra: "none" | "duplicate" | "replay" }
  | { kind: "wait-for-deadline" };

export function planFor(cohort: Cohort, questionIndex: number): RoundPlan {
  switch (cohort) {
    case "late":
      return questionIndex === LATE_ROUND_INDEX
        ? { kind: "wait-for-deadline" }
        : { kind: "answer", choice: "correct", extra: "none" };
    case "correct":
      return { kind: "answer", choice: "correct", extra: "none" };
    case "wrong":
      return { kind: "answer", choice: "wrong", extra: "none" };
    case "duplicate":
      return { kind: "answer", choice: "correct", extra: "duplicate" };
    case "replay":
      return { kind: "answer", choice: "correct", extra: "replay" };
  }
}

export interface ExpectedCounts {
  accepted: number;
  duplicateRejections: number;
  lateRejections: number;
  exactKeyReplays: number;
  unanswered: number;
}

export function expectedCounts(participantCount: number, questionCount: number): ExpectedCounts {
  const counts: ExpectedCounts = {
    accepted: 0,
    duplicateRejections: 0,
    lateRejections: 0,
    exactKeyReplays: 0,
    unanswered: 0,
  };
  for (let number = 1; number <= participantCount; number += 1) {
    const cohort = cohortOf(number);
    for (let index = 0; index < questionCount; index += 1) {
      const plan = planFor(cohort, index);
      if (plan.kind === "wait-for-deadline") {
        counts.lateRejections += 1;
        counts.unanswered += 1;
        continue;
      }
      counts.accepted += 1;
      if (plan.extra === "duplicate") counts.duplicateRejections += 1;
      if (plan.extra === "replay") counts.exactKeyReplays += 1;
    }
  }
  return counts;
}
