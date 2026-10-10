import { idempotencyKeySchema } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import { createIdempotencyKey, nextJoinKey } from "./join-key";

const createKey = () => "new-key";

describe("nextJoinKey", () => {
  it("starts a new join attempt with a fresh key", () => {
    expect(nextJoinKey(null, createKey)).toBe("new-key");
  });

  it("reuses the key after a transient failure so a retry cannot add a second Participant", () => {
    expect(nextJoinKey({ key: "old-key", failure: "join_failed" }, createKey)).toBe("old-key");
    expect(nextJoinKey({ key: "old-key", failure: "no_response" }, createKey)).toBe("old-key");
  });

  it("uses a fresh key after a definite refusal", () => {
    expect(nextJoinKey({ key: "old-key", failure: "invalid_display_name" }, createKey)).toBe(
      "new-key",
    );
    expect(nextJoinKey({ key: "old-key", failure: "room_full" }, createKey)).toBe("new-key");
  });
});

describe("createIdempotencyKey", () => {
  it("creates a UUID even where crypto.randomUUID is unavailable (plain-HTTP LAN testing)", () => {
    const withRandomUuid = createIdempotencyKey(globalThis.crypto);
    const withoutRandomUuid = createIdempotencyKey({
      getRandomValues: (array: Uint8Array) => globalThis.crypto.getRandomValues(array),
    });

    expect(idempotencyKeySchema.safeParse(withRandomUuid).success).toBe(true);
    expect(idempotencyKeySchema.safeParse(withoutRandomUuid).success).toBe(true);
    expect(withoutRandomUuid).not.toBe(createIdempotencyKey(globalThis.crypto));
  });
});
