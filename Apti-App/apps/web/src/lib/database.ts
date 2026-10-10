import "server-only";
import { createDatabase, type PrismaClient } from "@aptiquiz/database";

const globalForDatabase = globalThis as typeof globalThis & { aptiquizDatabase?: PrismaClient };

function readDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");

  try {
    new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }

  return value;
}

export const database = globalForDatabase.aptiquizDatabase ?? createDatabase(readDatabaseUrl());
if (process.env.NODE_ENV !== "production") globalForDatabase.aptiquizDatabase = database;
