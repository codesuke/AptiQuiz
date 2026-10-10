import { describe, expect, it } from "vitest";
import { needsEmailVerification, verificationPageState } from "./email-verification";

const verifiedSession = { user: { emailVerified: true } };
const unverifiedSession = { user: { emailVerified: false } };

describe("verificationPageState", () => {
  it("reports a verified email only when the signed-in User is verified", () => {
    expect(verificationPageState(undefined, verifiedSession)).toBe("verified");
  });

  it("does not claim success to a visitor without a session", () => {
    expect(verificationPageState(undefined, null)).toBe("signed-out");
  });

  it("offers a new link to a signed-in User who is still unverified", () => {
    expect(verificationPageState(undefined, unverifiedSession)).toBe("unverified");
  });

  it("reports an expired link", () => {
    expect(verificationPageState("TOKEN_EXPIRED", null)).toBe("expired");
    expect(verificationPageState("TOKEN_EXPIRED", unverifiedSession)).toBe("expired");
  });

  it("reports every other error as an invalid link", () => {
    expect(verificationPageState("INVALID_TOKEN", null)).toBe("invalid");
    expect(verificationPageState("USER_NOT_FOUND", verifiedSession)).toBe("invalid");
    expect(verificationPageState(["TOKEN_EXPIRED", "INVALID_TOKEN"], null)).toBe("invalid");
  });
});

describe("needsEmailVerification", () => {
  it("is true only for a signed-in User whose email is unverified", () => {
    expect(needsEmailVerification(null)).toBe(false);
    expect(needsEmailVerification(verifiedSession)).toBe(false);
    expect(needsEmailVerification(unverifiedSession)).toBe(true);
  });
});
