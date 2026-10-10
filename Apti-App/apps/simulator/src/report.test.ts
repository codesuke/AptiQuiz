import { describe, expect, it } from "vitest";
import { formatReport, scrubSecrets } from "./report.js";

describe("scrubSecrets", () => {
  it("replaces every occurrence of every secret", () => {
    expect(scrubSecrets("a SECRET b SECRET c TOKEN", ["SECRET", "TOKEN"])).toBe(
      "a [redacted] b [redacted] c [redacted]",
    );
  });

  it("ignores empty secrets", () => {
    expect(scrubSecrets("abc", [""])).toBe("abc");
  });
});

describe("formatReport", () => {
  it("never prints a secret that leaked into an error", () => {
    const text = formatReport(
      {
        ok: false,
        target: "http://localhost:3001",
        requestedParticipants: 2,
        lobby: null,
        errors: ["failed with cookie session=abc"],
        durationMs: 1,
      },
      ["session=abc"],
    );
    expect(text).not.toContain("session=abc");
    expect(text).toContain('"ok": false');
  });
});
