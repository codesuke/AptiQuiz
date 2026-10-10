import "server-only";
import { createDatabase, type PrismaClient } from "@aptiquiz/database";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import {
  buildPasswordResetEmail,
  buildPasswordResetLink,
  buildVerificationEmail,
} from "./auth-emails";
import { VERIFICATION_LINK_LIFETIME_SECONDS } from "./email-verification";
import { readSocialProviders } from "./google-sign-in";
import { createGmailMailSender, type MailSender } from "./mail-sender";
import { PASSWORD_RESET_LINK_LIFETIME_SECONDS } from "./password-reset";

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

let mailSender: MailSender | undefined;
// Created on first send so a build or route without mail never needs Gmail credentials.
function getMailSender() {
  mailSender ??= createGmailMailSender({
    environment: process.env.NODE_ENV,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
    gmailUser: process.env.GMAIL_USER,
    log: console.info,
  });
  return mailSender;
}

async function sendPasswordResetEmail({ user, token }: { user: { email: string }; token: string }) {
  const link = buildPasswordResetLink(readRequiredUrl("BETTER_AUTH_URL"), token);
  // Not awaited: a slow mail server must not reveal which emails have accounts.
  void Promise.resolve()
    .then(() => getMailSender().send(buildPasswordResetEmail({ to: user.email, link })))
    .catch((error: unknown) => console.error("Password reset email failed", error));
}

// Following the mailed reset link proves the User controls the inbox, so the email counts as
// verified. This gives the real owner of a pre-registered email a way to claim it.
async function markEmailVerifiedAfterReset({ user }: { user: { id: string } }) {
  await database.user.update({ where: { id: user.id }, data: { emailVerified: true } });
}

export const auth = betterAuth({
  baseURL: readRequiredUrl("BETTER_AUTH_URL"),
  database: prismaAdapter(database, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
    onPasswordReset: markEmailVerifiedAfterReset,
    resetPasswordTokenExpiresIn: PASSWORD_RESET_LINK_LIFETIME_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: sendPasswordResetEmail,
  },
  emailVerification: {
    expiresIn: VERIFICATION_LINK_LIFETIME_SECONDS,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await getMailSender().send(
        buildVerificationEmail({ email: user.email, name: user.name, url }),
      );
    },
  },
  rateLimit: {
    enabled: true,
    max: 5,
    window: 60,
    customRules: {
      "/request-password-reset": { max: 3, window: 300 },
      "/send-verification-email": { max: 3, window: 300 },
    },
  },
  secret: readRequiredSecret(),
  socialProviders: readSocialProviders(),
  // Google sign-in links to an existing User with the same email. Better Auth still requires the
  // existing User's email to be verified first, so an unverified pre-registration cannot capture it.
  // A password reset verifies the email, which opens the link for the real inbox owner.
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
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

export async function getSessionAccess(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return { kind: "guest" as const };

  const user = await database.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true, suspended: true },
  });
  if (!user) return { kind: "guest" as const };
  if (user.suspended) return { kind: "suspended" as const };

  const activeSession = {
    ...session,
    user: { ...session.user, email: user.email, emailVerified: user.emailVerified },
  };
  return { kind: "active" as const, user: activeSession.user, session: activeSession };
}

export async function getActiveSession(headers: Headers) {
  const access = await getSessionAccess(headers);
  return access.kind === "active" ? access.session : null;
}
