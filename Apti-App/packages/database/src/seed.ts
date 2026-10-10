import { seedColleges } from "./colleges.js";
import { createDatabase } from "./index.js";

const db = createDatabase(process.env.DATABASE_URL ?? "");
try {
  await seedColleges(db);
} finally {
  await db.$disconnect();
}
