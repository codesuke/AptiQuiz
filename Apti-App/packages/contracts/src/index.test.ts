import { describe, expect, it } from "vitest";
import { roomCodeSchema } from "./index.js";

describe("roomCodeSchema", () => {
  it("normalizes a valid room code", () => {
    expect(roomCodeSchema.parse(" ab2cd3 ")).toBe("AB2CD3");
  });

  it("rejects ambiguous characters", () => {
    expect(roomCodeSchema.safeParse("ABI0O1").success).toBe(false);
  });
});
