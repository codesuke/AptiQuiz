import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createDatabase(connectionString: string): PrismaClient {
  if (connectionString.length === 0) {
    throw new Error("A PostgreSQL connection string is required");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export { APPROVED_COLLEGES, collegeIdFor, normalizeCollegeName, seedColleges } from "./colleges.js";
export type { PrismaClient } from "./generated/prisma/client.js";
