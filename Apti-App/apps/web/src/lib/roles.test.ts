import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRole } from "./roles";

afterEach(() => vi.unstubAllEnvs());

describe("resolveRole", () => {
  it("recognizes only verified allow-listed Users, ignoring case and surrounding whitespace", () => {
    const session = { user: { email: "ADMIN@Example.com", emailVerified: true } };

    expect(resolveRole(session, " other@example.com , admin@example.COM  ")).toBe("admin");
    expect(
      resolveRole({ user: { ...session.user, emailVerified: false } }, "admin@example.com"),
    ).toBe("user");
    expect(resolveRole(session, "other@example.com")).toBe("user");
    expect(resolveRole(null, "admin@example.com")).toBe("guest");
  });

  it("reads the current allow-list on each request", () => {
    const session = { user: { email: "admin@example.com", emailVerified: true } };
    vi.stubEnv("ADMIN_EMAILS", " admin@example.com ");
    expect(resolveRole(session)).toBe("admin");
    vi.stubEnv("ADMIN_EMAILS", "other@example.com");
    expect(resolveRole(session)).toBe("user");
  });
});
