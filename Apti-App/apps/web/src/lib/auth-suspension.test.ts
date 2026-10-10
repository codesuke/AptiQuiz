import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createDatabase } from "@aptiquiz/database";
import { describe, expect, it, vi } from "vitest";

const envFile = new URL("../../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.BETTER_AUTH_URL;
const hasDatabase = Boolean(databaseUrl && baseUrl && process.env.BETTER_AUTH_SECRET);

describe.runIf(hasDatabase)("suspended User", () => {
  it("cannot sign in and loses an existing session on the next request", async () => {
    if (!databaseUrl || !baseUrl)
      throw new Error("Database-backed auth test needs its environment");
    const { auth } = await import("./auth");
    const database = createDatabase(databaseUrl);
    const email = `suspended-${randomUUID()}@example.test`;
    const password = `P@ssword-${randomUUID()}`;

    async function request(path: string, body?: object, cookie?: string) {
      return auth.handler(
        new Request(new URL(`/api/auth${path}`, baseUrl), {
          method: body ? "POST" : "GET",
          headers: {
            ...(body ? { "content-type": "application/json" } : {}),
            ...(cookie ? { cookie } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
    }

    try {
      const signup = await request("/sign-up/email", {
        name: "Suspension test",
        email,
        password,
      });
      expect(signup.status).toBe(200);
      const cookie = signup.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      expect((await (await request("/get-session", undefined, cookie)).json())?.user.email).toBe(
        email,
      );

      await database.user.update({ where: { email }, data: { suspended: true } });

      const suspendedSession = await request("/get-session", undefined, cookie);
      expect(await suspendedSession.json()).toBeNull();
      const signIn = await request("/sign-in/email", { email, password });
      expect(signIn.status).toBe(403);
      expect((await signIn.json()).code).toBe("ACCOUNT_SUSPENDED");
    } finally {
      await database.user.deleteMany({ where: { email } });
      await database.$disconnect();
    }
  }, 30_000);
});
