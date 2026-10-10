import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createDatabase } from "@aptiquiz/database";
import { afterAll, describe, expect, it, vi } from "vitest";

const envFile = new URL("../../../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

vi.mock("server-only", () => ({}));

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.BETTER_AUTH_URL;
const hasAuthEnvironment = Boolean(databaseUrl && baseUrl && process.env.BETTER_AUTH_SECRET);

const testClientId = "test-client.apps.googleusercontent.com";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";

interface GoogleProfile {
  email: string;
  emailVerified: boolean;
}

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

function base64Url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Google's token response. Better Auth decodes the id token from this trusted back channel. */
function googleTokenResponse({ email, emailVerified }: GoogleProfile) {
  const idToken = [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      aud: testClientId,
      email,
      email_verified: emailVerified,
      iss: "https://accounts.google.com",
      name: "Google Tester",
      sub: `google-${email}`,
    }),
    "",
  ].join(".");
  return Response.json({
    access_token: "test-access-token",
    expires_in: 3600,
    id_token: idToken,
    scope: "openid email profile",
    token_type: "Bearer",
  });
}

describe.runIf(hasAuthEnvironment)("Google sign-in", async () => {
  if (!databaseUrl || !baseUrl) throw new Error("Auth integration test needs its environment");
  vi.stubEnv("GOOGLE_CLIENT_ID", testClientId);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
  const { auth } = await import("./auth");
  const database = createDatabase(databaseUrl);
  const origin = new URL(baseUrl).origin;
  const createdEmails: string[] = [];
  // Each request gets its own client address so the shared auth rate limit does not throttle tests.
  let requestCount = 0;

  afterAll(async () => {
    await database.user.deleteMany({ where: { email: { in: createdEmails } } });
    await database.$disconnect();
  });

  function uniqueEmail(label: string) {
    const email = `google-${label}-${randomUUID()}@example.test`;
    createdEmails.push(email);
    return email;
  }

  function request(path: string, init: { body?: object; cookie?: string } = {}) {
    return auth.handler(
      new Request(new URL(`/api/auth${path}`, baseUrl), {
        body: init.body ? JSON.stringify(init.body) : undefined,
        headers: {
          origin,
          "x-forwarded-for": `198.51.100.${++requestCount % 250}`,
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...(init.cookie ? { cookie: init.cookie } : {}),
        },
        method: init.body ? "POST" : "GET",
      }),
    );
  }

  async function startGoogleSignIn() {
    const response = await request("/sign-in/social", {
      body: { callbackURL: "/", errorCallbackURL: "/sign-in", provider: "google" },
    });
    expect(response.status).toBe(200);
    const { url } = (await response.json()) as { url: string };
    return { authorizationUrl: new URL(url), cookie: cookieHeader(response) };
  }

  async function signInWithGoogle(profile: GoogleProfile) {
    const { authorizationUrl, cookie } = await startGoogleSignIn();
    const state = authorizationUrl.searchParams.get("state") ?? "";
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      String(input) === googleTokenEndpoint
        ? Promise.resolve(googleTokenResponse(profile))
        : realFetch(input, init),
    );
    try {
      return await request(`/callback/google?code=test-code&state=${state}`, { cookie });
    } finally {
      vi.unstubAllGlobals();
    }
  }

  async function signUpWithPassword(email: string) {
    const response = await request("/sign-up/email", {
      body: { email, name: "Password Tester", password: `P@ssword-${randomUUID()}` },
    });
    expect(response.status).toBe(200);
    return database.user.findUniqueOrThrow({ where: { email } });
  }

  function providersOf(email: string) {
    return database.account
      .findMany({ where: { user: { email } }, select: { providerId: true } })
      .then((accounts) => accounts.map((account) => account.providerId).sort());
  }

  it("starts the Google flow with the local callback as the redirect URI", async () => {
    const { authorizationUrl } = await startGoogleSignIn();

    expect(authorizationUrl.origin).toBe("https://accounts.google.com");
    expect(authorizationUrl.searchParams.get("client_id")).toBe(testClientId);
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      new URL("/api/auth/callback/google", baseUrl).toString(),
    );
    expect(authorizationUrl.searchParams.get("scope")).toContain("email");
  });

  it("signs a new visitor in and creates a verified User", async () => {
    const email = uniqueEmail("new");

    const callback = await signInWithGoogle({ email, emailVerified: true });

    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("/");
    const session = await (
      await request("/get-session", { cookie: cookieHeader(callback) })
    ).json();
    expect(session?.user.email).toBe(email);
    expect(session?.user.emailVerified).toBe(true);
    expect(await providersOf(email)).toEqual(["google"]);
  }, 30_000);

  it("opens the same User for a verified password account with the same email", async () => {
    const email = uniqueEmail("linked");
    const passwordUser = await signUpWithPassword(email);
    await database.user.update({ where: { email }, data: { emailVerified: true } });

    const callback = await signInWithGoogle({ email, emailVerified: true });

    expect(callback.headers.get("location")).toBe("/");
    const session = await (
      await request("/get-session", { cookie: cookieHeader(callback) })
    ).json();
    expect(session?.user.id).toBe(passwordUser.id);
    expect(await providersOf(email)).toEqual(["credential", "google"]);
  }, 30_000);

  it("does not link to an unverified password account and explains why", async () => {
    const email = uniqueEmail("unverified");
    await signUpWithPassword(email);

    const callback = await signInWithGoogle({ email, emailVerified: true });

    expect(callback.headers.get("location")).toBe("/sign-in?error=account_not_linked");
    expect(await providersOf(email)).toEqual(["credential"]);
  }, 30_000);

  it("refuses a suspended User", async () => {
    const email = uniqueEmail("suspended");
    await signInWithGoogle({ email, emailVerified: true });
    await database.user.update({ where: { email }, data: { suspended: true } });

    const callback = await signInWithGoogle({ email, emailVerified: true });

    expect(callback.headers.get("location")).toMatch(/^\/sign-in\?error=ACCOUNT_SUSPENDED/);
    expect(callback.headers.getSetCookie().join()).not.toMatch(/session_token=[^;]/);
  }, 30_000);
});
