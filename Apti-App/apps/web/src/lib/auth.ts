import "server-only";
import { createDatabase, type PrismaClient } from "@aptiquiz/database";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

function readRequiredUrl(name: "BETTER_AUTH_URL" | "DATABASE_URL") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authentication`);

  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  return value;
}

function readRequiredSecret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  return value;
}

const globalForDatabase = globalThis as typeof globalThis & { aptiquizDatabase?: PrismaClient };
const database =
  globalForDatabase.aptiquizDatabase ?? createDatabase(readRequiredUrl("DATABASE_URL"));
if (process.env.NODE_ENV !== "production") globalForDatabase.aptiquizDatabase = database;

export const auth = betterAuth({
  baseURL: readRequiredUrl("BETTER_AUTH_URL"),
  database: prismaAdapter(database, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, maxPasswordLength: 128, minPasswordLength: 8 },
  rateLimit: { enabled: true, max: 5, window: 60 },
  secret: readRequiredSecret(),
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await database.user.findUnique({
            where: { id: session.userId },
            select: { suspended: true },
          });
          if (user?.suspended) {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_SUSPENDED",
              message: "Account suspended",
            });
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const token = await ctx.getSignedCookie(
        ctx.context.authCookies.sessionToken.name,
        ctx.context.secret,
      );
      if (!token) return;

      const session = await ctx.context.internalAdapter.findSession(token);
      if (!session) return;

      const user = await database.user.findUnique({
        where: { id: session.user.id },
        select: { suspended: true },
      });
      if (!user?.suspended) return;

      if (ctx.path === "/get-session") return ctx.json(null);
      throw new APIError("UNAUTHORIZED", {
        code: "ACCOUNT_SUSPENDED",
        message: "Account suspended",
      });
    }),
  },
  user: { additionalFields: { suspended: { defaultValue: false, input: false, type: "boolean" } } },
});

export async function getActiveSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;

  const user = await database.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, suspended: true },
  });
  if (!user || user.suspended) return null;

  return {
    ...session,
    user: { ...session.user, email: user.email, emailVerified: user.emailVerified },
  };
}
