import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createDatabase } from "@aptiquiz/database";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

const envFile = new URL("../../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.BETTER_AUTH_URL;
const hasDatabase = Boolean(databaseUrl && baseUrl && process.env.BETTER_AUTH_SECRET);

const resetLinkPattern = /https?:\/\/\S+\/api\/auth\/reset-password\/\S+/;

function randomClientIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

function sessionCookieFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

async function createClient() {
  if (!baseUrl) throw new Error("Database-backed auth test needs BETTER_AUTH_URL");
  const { auth } = await import("./auth");
  const clientIp = randomClientIp();

  return function request(path: string, init: { body?: object; cookie?: string } = {}) {
    const url = path.startsWith("http") ? path : new URL(`/api/auth${path}`, baseUrl);
    return auth.handler(
      new Request(url, {
        method: init.body ? "POST" : "GET",
        headers: {
          "x-forwarded-for": clientIp,
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...(init.cookie ? { cookie: init.cookie } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      }),
    );
  };
}

describe.runIf(hasDatabase)("password reset", () => {
  let log: MockInstance<typeof console.info>;

  beforeEach(() => {
    // Route mail to the development log sender instead of Gmail.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("mails a one-time link that replaces the password, verifies the email, and ends other sessions", async () => {
    if (!databaseUrl) throw new Error("Database-backed auth test needs DATABASE_URL");
    const request = await createClient();
    const database = createDatabase(databaseUrl);
    const email = `reset-${randomUUID()}@example.test`;
    const oldPassword = `Old-${randomUUID()}`;
    const newPassword = `New-${randomUUID()}`;

    try {
      const signUp = await request("/sign-up/email", {
        body: { name: "Reset test", email, password: oldPassword },
      });
      expect(signUp.status).toBe(200);
      const otherSession = sessionCookieFrom(signUp);
      const readEmailVerified = async () =>
        (await database.user.findUnique({ where: { email }, select: { emailVerified: true } }))
          ?.emailVerified;
      expect(await readEmailVerified()).toBe(false);

      const known = await request("/request-password-reset", { body: { email } });
      const unknown = await request("/request-password-reset", {
        body: { email: `nobody-${randomUUID()}@example.test` },
      });
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(known.status);
      expect(await unknown.json()).toEqual(await known.json());

      const mailLog = await vi.waitFor(() => {
        const entry = log.mock.calls
          .map(([line]) => String(line))
          // Sign-up also logs a verification email for this address; pick the reset one.
          .find((line) => line.includes(email) && resetLinkPattern.test(line));
        if (!entry) throw new Error("reset email not logged yet");
        return entry;
      });
      expect(log.mock.calls.filter(([line]) => String(line).includes("nobody-"))).toHaveLength(0);
      const link = mailLog.match(resetLinkPattern)?.[0];
      if (!link) throw new Error("reset email has no link");

      const opened = await request(link);
      const resetPage = new URL(opened.headers.get("location") ?? "", baseUrl);
      expect(resetPage.pathname).toBe("/reset-password");
      const token = resetPage.searchParams.get("token");
      expect(token).toBeTruthy();

      const reset = await request("/reset-password", { body: { token, newPassword } });
      expect(reset.status).toBe(200);
      // The reset link reached the inbox, so the reset also proves the User owns the email.
      expect(await readEmailVerified()).toBe(true);

      expect(await (await request("/get-session", { cookie: otherSession })).json()).toBeNull();
      const oldSignIn = await request("/sign-in/email", { body: { email, password: oldPassword } });
      expect(oldSignIn.status).toBe(401);
      const newSignIn = await request("/sign-in/email", { body: { email, password: newPassword } });
      expect(newSignIn.status).toBe(200);

      const reopened = await request(link);
      const expiredPage = new URL(reopened.headers.get("location") ?? "", baseUrl);
      expect(expiredPage.pathname).toBe("/reset-password");
      expect(expiredPage.searchParams.get("error")).toBe("INVALID_TOKEN");
      const reused = await request("/reset-password", {
        body: { token, newPassword: oldPassword },
      });
      expect((await reused.json()).code).toBe("INVALID_TOKEN");
    } finally {
      await database.user.deleteMany({ where: { email } });
      await database.$disconnect();
    }
  }, 120_000);

  it("rate-limits repeated reset requests from one client", async () => {
    const request = await createClient();
    const body = { email: `nobody-${randomUUID()}@example.test` };

    const responses: Response[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await request("/request-password-reset", { body }));
    }

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 429]);
    const retryAfterSeconds = Number(responses[3]?.headers.get("x-retry-after"));
    expect(retryAfterSeconds).toBeGreaterThan(60);
  }, 120_000);
});
