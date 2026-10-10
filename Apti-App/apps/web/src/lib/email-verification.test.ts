import { describe, expect, it } from "vitest";
import {
  buildVerificationEmail,
  needsEmailVerification,
  resendOutcome,
  verificationLinkState,
} from "./email-verification";

const betterAuthUrl =
  "https://aptiquiz.test/api/auth/verify-email?token=signed.jwt.token&callbackURL=%2F";

describe("buildVerificationEmail", () => {
  it("addresses the User and links to the verification result page", () => {
    const message = buildVerificationEmail({
      name: "Asha",
      email: "asha@example.com",
      url: betterAuthUrl,
    });

    expect(message.to).toBe("asha@example.com");
    expect(message.subject).toBe("Verify your AptiQuiz email");
    expect(message.text).toContain("Hi Asha,");
    expect(message.text).toContain(
      "https://aptiquiz.test/api/auth/verify-email?token=signed.jwt.token&callbackURL=%2Fverify-email",
    );
  });

  it("explains why verification matters and when the link expires", () => {
    const { text } = buildVerificationEmail({
      name: "Asha",
      email: "asha@example.com",
      url: betterAuthUrl,
    });

    expect(text).toContain("College League points");
    expect(text).toContain("expires in 1 hour");
  });

  it("adds the result page when the link has no callback", () => {
    const { text } = buildVerificationEmail({
      name: "Asha",
      email: "asha@example.com",
      url: "https://aptiquiz.test/api/auth/verify-email?token=abc",
    });

    expect(text).toContain(
      "https://aptiquiz.test/api/auth/verify-email?token=abc&callbackURL=%2Fverify-email",
    );
  });
});

describe("verificationLinkState", () => {
  it("reports a verified email when the link carried no error", () => {
    expect(verificationLinkState(undefined)).toBe("verified");
  });

  it("reports an expired link", () => {
    expect(verificationLinkState("TOKEN_EXPIRED")).toBe("expired");
  });

  it("reports every other error as an invalid link", () => {
    expect(verificationLinkState("INVALID_TOKEN")).toBe("invalid");
    expect(verificationLinkState("USER_NOT_FOUND")).toBe("invalid");
    expect(verificationLinkState(["TOKEN_EXPIRED", "INVALID_TOKEN"])).toBe("invalid");
  });
});

describe("needsEmailVerification", () => {
  it("is true only for a signed-in User whose email is unverified", () => {
    expect(needsEmailVerification(null)).toBe(false);
    expect(needsEmailVerification({ user: { emailVerified: true } })).toBe(false);
    expect(needsEmailVerification({ user: { emailVerified: false } })).toBe(true);
  });
});

describe("resendOutcome", () => {
  it("maps the resend response status to what the User is told", () => {
    expect(resendOutcome(200)).toBe("sent");
    expect(resendOutcome(429)).toBe("rate_limited");
    expect(resendOutcome(400)).toBe("failed");
    expect(resendOutcome(500)).toBe("failed");
  });
});
