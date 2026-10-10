import { describe, expect, it } from "vitest";
import { keyForScope } from "./scoped-key";

describe("keyForScope", () => {
  it("creates one key per scope and reuses it for retries", () => {
    const keys = new Map<string, string>();
    let next = 0;
    const createKey = () => `key-${++next}`;

    expect(keyForScope(keys, "a", createKey)).toBe("key-1");
    expect(keyForScope(keys, "a", createKey)).toBe("key-1");
    expect(keyForScope(keys, "b", createKey)).toBe("key-2");
  });
});
