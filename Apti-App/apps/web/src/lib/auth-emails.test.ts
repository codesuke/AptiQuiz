import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildPasswordResetEmail, buildPasswordResetLink, buildVerificationEmail } = await import(
  "./auth-emails"
);

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

describe("buildPasswordResetLink", () => {
  it("points at the Better Auth token check and returns to the reset page", () => {
    expect(buildPasswordResetLink("https://aptiquiz.test", "abc123")).toBe(
      "https://aptiquiz.test/api/auth/reset-password/abc123?callbackURL=%2Freset-password",
    );
  });

  it("ignores a trailing slash on the base URL and encodes the token", () => {
    expect(buildPasswordResetLink("http://localhost:3000/", "a/b c")).toBe(
      "http://localhost:3000/api/auth/reset-password/a%2Fb%20c?callbackURL=%2Freset-password",
    );
  });
});

describe("buildPasswordResetEmail", () => {
  it("addresses the User and contains the reset link and its lifetime", () => {
    const link =
      "https://aptiquiz.test/api/auth/reset-password/abc123?callbackURL=%2Freset-password";
    const message = buildPasswordResetEmail({ to: "student@example.com", link });

    expect(message.to).toBe("student@example.com");
    expect(message.subject).toBe("Reset your AptiQuiz password");
    expect(message.text).toContain(link);
    expect(message.text).toContain("expires in 60 minutes");
    expect(message.text).toContain("you can ignore this email");
  });
});
