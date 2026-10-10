import { describe, expect, it } from "vitest";
import {
  buildPasswordResetEmail,
  buildPasswordResetLink,
  readResetLinkState,
  readResetPasswordOutcome,
  readResetRequestOutcome,
} from "./password-reset";

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

describe("readResetLinkState", () => {
  it("is ready when the link carries one token and no error", () => {
    expect(readResetLinkState({ token: "abc123" })).toEqual({ kind: "ready", token: "abc123" });
  });

  it("is expired when Better Auth reports an invalid or used token", () => {
    expect(readResetLinkState({ error: "INVALID_TOKEN" })).toEqual({ kind: "expired" });
    expect(readResetLinkState({ error: "INVALID_TOKEN", token: "abc123" })).toEqual({
      kind: "expired",
    });
  });

  it("is expired when the token is missing, empty, or repeated", () => {
    expect(readResetLinkState({})).toEqual({ kind: "expired" });
    expect(readResetLinkState({ token: "" })).toEqual({ kind: "expired" });
    expect(readResetLinkState({ token: ["a", "b"] })).toEqual({ kind: "expired" });
  });
});

describe("readResetRequestOutcome", () => {
  it("confirms every accepted request so the response never reveals an account", () => {
    expect(readResetRequestOutcome(200)).toBe("sent");
  });

  it("separates rate limiting from other failures", () => {
    expect(readResetRequestOutcome(429)).toBe("rate-limited");
    expect(readResetRequestOutcome(400)).toBe("failed");
    expect(readResetRequestOutcome(500)).toBe("failed");
  });
});

describe("readResetPasswordOutcome", () => {
  it("succeeds on an accepted reset", () => {
    expect(readResetPasswordOutcome(200, { status: true })).toBe("updated");
  });

  it("treats an invalid or used token as an expired link", () => {
    expect(readResetPasswordOutcome(400, { code: "INVALID_TOKEN", message: "Invalid token" })).toBe(
      "expired",
    );
  });

  it("reports rate limiting and other failures without treating them as expiry", () => {
    expect(readResetPasswordOutcome(429, null)).toBe("rate-limited");
    expect(readResetPasswordOutcome(400, { code: "PASSWORD_TOO_SHORT" })).toBe("failed");
    expect(readResetPasswordOutcome(500, "not json")).toBe("failed");
  });
});
