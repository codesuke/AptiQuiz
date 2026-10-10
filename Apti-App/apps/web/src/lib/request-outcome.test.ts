import { describe, expect, it } from "vitest";
import { readRequestOutcome } from "./request-outcome";

describe("readRequestOutcome", () => {
  it("confirms every accepted request so the response never reveals an account", () => {
    expect(readRequestOutcome(200)).toBe("sent");
  });

  it("separates rate limiting from other failures", () => {
    expect(readRequestOutcome(429)).toBe("rate-limited");
    expect(readRequestOutcome(400)).toBe("failed");
    expect(readRequestOutcome(500)).toBe("failed");
  });
});
