import { describe, expect, it } from "vitest";
import { InvariantFailure, Invariants } from "./invariants.js";

describe("Invariants", () => {
  it("keeps counting past the reporting cap", () => {
    const invariants = new Invariants();
    for (let index = 0; index < 25; index += 1) invariants.check(false, `fail ${index}`);
    expect(invariants.count).toBe(25);
    const failure = (() => {
      try {
        invariants.throwIfBroken();
      } catch (error) {
        return error;
      }
    })();
    expect(failure).toBeInstanceOf(InvariantFailure);
    expect((failure as InvariantFailure).details).toHaveLength(21);
    expect((failure as InvariantFailure).details.at(-1)).toBe("5 more violation(s) not listed");
  });

  it("passes when every check holds", () => {
    const invariants = new Invariants();
    invariants.check(true, "fine");
    expect(() => invariants.throwIfBroken()).not.toThrow();
  });
});
