import { idempotencyKeySchema } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import {
  createIdempotencyKey,
  forgetStoredJoin,
  type JoinStorage,
  nextJoinKey,
  readStoredJoin,
  rememberJoin,
  settleStoredJoin,
} from "./join-key";

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

function memoryStorage(): JoinStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

const attempt = {
  joinCode: "ABC234",
  displayName: "Asha",
  idempotencyKey: "0b7a8c3e-6f0e-4d4a-9a55-5b1f7f0f6e01",
};

describe("stored join attempts", () => {
  it("remembers a join attempt per Join Code so a refresh rejoins as the same Participant", () => {
    const storage = memoryStorage();

    rememberJoin(storage, attempt);

    expect(storage.items.has("aptiquiz:join:ABC234")).toBe(true);
    expect(readStoredJoin(storage, "ABC234")).toEqual(attempt);
    expect(readStoredJoin(storage, "XYZ789")).toBeNull();
  });

  it("ignores a stored value that is malformed or belongs to another Join Code", () => {
    const storage = memoryStorage();
    storage.setItem("aptiquiz:join:ABC234", "{not json");
    expect(readStoredJoin(storage, "ABC234")).toBeNull();

    storage.setItem("aptiquiz:join:ABC234", JSON.stringify({ ...attempt, idempotencyKey: "x" }));
    expect(readStoredJoin(storage, "ABC234")).toBeNull();

    storage.setItem("aptiquiz:join:ABC234", JSON.stringify({ ...attempt, joinCode: "XYZ789" }));
    expect(readStoredJoin(storage, "ABC234")).toBeNull();
  });

  it("forgets the attempt when the server refuses it for good, and keeps it after a transient failure", () => {
    const storage = memoryStorage();
    rememberJoin(storage, attempt);

    settleStoredJoin(storage, "ABC234", "no_response");
    expect(readStoredJoin(storage, "ABC234")).toEqual(attempt);

    settleStoredJoin(storage, "ABC234", "room_not_found");
    expect(readStoredJoin(storage, "ABC234")).toBeNull();
  });

  it("treats unavailable storage as empty instead of throwing", () => {
    const broken: JoinStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(() => rememberJoin(broken, attempt)).not.toThrow();
    expect(() => forgetStoredJoin(broken, "ABC234")).not.toThrow();
    expect(readStoredJoin(broken, "ABC234")).toBeNull();
  });
});
