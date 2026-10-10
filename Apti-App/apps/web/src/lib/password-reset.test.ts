import { describe, expect, it } from "vitest";
import { readResetLinkState, readResetPasswordOutcome } from "./password-reset";

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
