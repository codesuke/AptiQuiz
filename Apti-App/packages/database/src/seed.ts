import { seedColleges } from "./colleges.js";
import { createDatabase } from "./index.js";
import { seedStarterQuestionSet } from "./question-sets.js";

const db = createDatabase(process.env.DATABASE_URL ?? "");
try {
  await seedColleges(db);
  await seedStarterQuestionSet(db);
} finally {
  await db.$disconnect();
}
