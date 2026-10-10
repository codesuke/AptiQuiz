import { describe, expect, it } from "vitest";
import type { JoinStorage } from "./join-key";
import {
  forgetResumeToken,
  nextReconnectStep,
  readResumeToken,
  rememberResumeToken,
  resumeFallback,
} from "./resume-token";

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

const blockedStorage: JoinStorage = {
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

const token = "t".repeat(43);
const pendingJoin = {
  joinCode: "ABC234",
  displayName: "Asha",
  idempotencyKey: "0b7a8c3e-6f0e-4d4a-9a55-5b1f7f0f6e01",
};

describe("stored Resume Tokens", () => {
  it("keeps one token per Join Code", () => {
    const storage = memoryStorage();

    expect(rememberResumeToken(storage, "ABC234", token)).toBe(true);

    expect(storage.items.get("aptiquiz:resume:ABC234")).toBe(token);
    expect(readResumeToken(storage, "ABC234")).toBe(token);
    expect(readResumeToken(storage, "XYZ789")).toBeNull();
  });

  it("forgets the token for one Join Code only", () => {
    const storage = memoryStorage();
    rememberResumeToken(storage, "ABC234", token);
    rememberResumeToken(storage, "XYZ789", token);

    forgetResumeToken(storage, "ABC234");

    expect(readResumeToken(storage, "ABC234")).toBeNull();
    expect(readResumeToken(storage, "XYZ789")).toBe(token);
  });

  it("ignores a stored value that is not a valid token", () => {
    const storage = memoryStorage();
    storage.setItem("aptiquiz:resume:ABC234", "short");

    expect(readResumeToken(storage, "ABC234")).toBeNull();
  });

  it("treats blocked storage as empty instead of throwing", () => {
    expect(rememberResumeToken(blockedStorage, "ABC234", token)).toBe(false);
    expect(() => forgetResumeToken(blockedStorage, "ABC234")).not.toThrow();
    expect(readResumeToken(blockedStorage, "ABC234")).toBeNull();
  });
});

describe("nextReconnectStep", () => {
  it("resumes with a stored token, even when a pending join also exists", () => {
    expect(nextReconnectStep(token, null)).toEqual({ kind: "resume", resumeToken: token });
    expect(nextReconnectStep(token, pendingJoin)).toEqual({ kind: "resume", resumeToken: token });
  });

  it("replays the pending join only when no token arrived", () => {
    expect(nextReconnectStep(null, pendingJoin)).toEqual({ kind: "rejoin", attempt: pendingJoin });
  });

  it("does nothing for a visitor who never joined", () => {
    expect(nextReconnectStep(null, null)).toEqual({ kind: "none" });
  });
});

describe("resumeFallback", () => {
  it("keeps the token and retries after a lost or malformed acknowledgement", () => {
    expect(resumeFallback("no_response", pendingJoin)).toEqual({ kind: "retry" });
    expect(resumeFallback("join_failed", null)).toEqual({ kind: "retry" });
  });

  it("replays a pending join after a definite refusal", () => {
    expect(resumeFallback("invalid_resume_token", pendingJoin)).toEqual({
      kind: "rejoin",
      attempt: pendingJoin,
    });
  });

  it("asks to join again after a definite refusal without a pending join", () => {
    expect(resumeFallback("invalid_resume_token", null)).toEqual({ kind: "join_again" });
    expect(resumeFallback("room_not_found", null)).toEqual({ kind: "join_again" });
  });
});
