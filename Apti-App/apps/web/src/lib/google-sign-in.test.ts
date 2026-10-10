import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { describeGoogleSignInError, isGoogleSignInAvailable, readSocialProviders } = await import(
  "./google-sign-in"
);

describe("readSocialProviders", () => {
  it("enables Google when both credentials are present, trimming surrounding whitespace", () => {
    expect(
      readSocialProviders({ GOOGLE_CLIENT_ID: " id.apps ", GOOGLE_CLIENT_SECRET: " secret " }),
    ).toEqual({ google: { clientId: "id.apps", clientSecret: "secret" } });
  });

  it("leaves Google disabled when either credential is missing or blank", () => {
    expect(readSocialProviders({})).toEqual({});
    expect(
      readSocialProviders({ GOOGLE_CLIENT_ID: "id.apps", GOOGLE_CLIENT_SECRET: "  " }),
    ).toEqual({});
    expect(readSocialProviders({ GOOGLE_CLIENT_SECRET: "secret" })).toEqual({});
  });
});

describe("isGoogleSignInAvailable", () => {
  it("offers the Google button only when the provider is configured", () => {
    expect(
      isGoogleSignInAvailable({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
    ).toBe(true);
    expect(isGoogleSignInAvailable({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
  });
});

describe("describeGoogleSignInError", () => {
  it("points the owner of an unverified password account to a password reset", () => {
    const message = describeGoogleSignInError("account_not_linked");
    expect(message).toMatch(/Forgot password\?/);
    expect(message).toMatch(/verif/i);
  });

  it("tells a suspended User that the account is suspended", () => {
    expect(describeGoogleSignInError("ACCOUNT_SUSPENDED")).toMatch(/suspended/i);
  });

  it("uses a generic message for other provider errors and nothing without an error", () => {
    expect(describeGoogleSignInError("access_denied")).toMatch(
      /could not sign you in with Google/i,
    );
    expect(describeGoogleSignInError(undefined)).toBeNull();
  });
});
