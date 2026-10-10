import { roomErrorSchema } from "@aptiquiz/contracts";
import { describe, expect, it } from "vitest";
import {
  isTransientJoinFailure,
  joinFailureMessage,
  parseDisplayNameInput,
  parseJoinCodeInput,
} from "./room-errors";

describe("joinFailureMessage", () => {
  it("explains every Room error in plain language", () => {
    for (const error of roomErrorSchema.options) {
      expect(joinFailureMessage(error)).toMatch(/\w+.*\./);
    }
  });

  it("names the recoverable cause for the common join failures", () => {
    expect(joinFailureMessage("room_full")).toBe("This Room is full (50 players).");
    expect(joinFailureMessage("room_not_in_lobby")).toBe(
      "This match has already started, so new players can't join.",
    );
    expect(joinFailureMessage("room_not_found")).toBe(
      "We couldn't find a Room with that code. Check the code and try again.",
    );
    expect(joinFailureMessage("invalid_join_code")).toContain("6");
    expect(joinFailureMessage("invalid_display_name")).toContain("2 to 32 characters");
    expect(joinFailureMessage("no_response")).toContain("try again");
  });
});

describe("isTransientJoinFailure", () => {
  it("treats only server or connection hiccups as safe to retry with the same key", () => {
    expect(isTransientJoinFailure("join_failed")).toBe(true);
    expect(isTransientJoinFailure("no_response")).toBe(true);
    expect(isTransientJoinFailure("room_full")).toBe(false);
    expect(isTransientJoinFailure("invalid_display_name")).toBe(false);
  });
});

describe("parseJoinCodeInput", () => {
  it("normalises a valid Join Code to uppercase", () => {
    expect(parseJoinCodeInput("  ab3cd9 ")).toEqual({ ok: true, value: "AB3CD9" });
  });

  it("rejects codes with the wrong length or characters", () => {
    expect(parseJoinCodeInput("ABC")).toEqual({
      ok: false,
      message: joinFailureMessage("invalid_join_code"),
    });
    expect(parseJoinCodeInput("ABC-12").ok).toBe(false);
    expect(parseJoinCodeInput("").ok).toBe(false);
  });
});

describe("parseDisplayNameInput", () => {
  it("trims a valid display name", () => {
    expect(parseDisplayNameInput("  Asha  ")).toEqual({ ok: true, value: "Asha" });
  });

  it("rejects names shorter than 2 or longer than 32 characters", () => {
    const tooShort = parseDisplayNameInput(" A ");
    expect(tooShort).toEqual({ ok: false, message: joinFailureMessage("invalid_display_name") });
    expect(parseDisplayNameInput("x".repeat(33)).ok).toBe(false);
  });
});
