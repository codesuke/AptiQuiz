import { describe, expect, it, vi } from "vitest";
import {
  buildJoinLink,
  buildRoomInvite,
  describeCreateRoomFailure,
  describeRoomError,
  requestRoomCreation,
} from "./rooms-client";

const request = { questionSetId: "set_1", idempotencyKey: "0b7a8c3e-6f0e-4d4a-9a55-5b1f7f0f6e01" };

describe("requestRoomCreation", () => {
  it("posts the request and returns the created Room", async () => {
    const fetchRoom = vi.fn(async () => Response.json({ roomId: "room_1", joinCode: "ABC234" }));

    const outcome = await requestRoomCreation(request, fetchRoom as unknown as typeof fetch);

    expect(outcome).toEqual({ ok: true, room: { roomId: "room_1", joinCode: "ABC234" } });
    expect(fetchRoom).toHaveBeenCalledWith(
      "/api/rooms",
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) }),
    );
  });

  it("returns the server's error code", async () => {
    const fetchRoom = async () =>
      Response.json({ error: "home_college_required" }, { status: 409 });

    expect(await requestRoomCreation(request, fetchRoom as unknown as typeof fetch)).toEqual({
      ok: false,
      error: "home_college_required",
    });
  });

  it("treats network failures and unknown replies as a network error", async () => {
    const offline = async () => {
      throw new TypeError("fetch failed");
    };
    const unknown = async () => Response.json({ error: "teapot" }, { status: 418 });

    expect(await requestRoomCreation(request, offline as unknown as typeof fetch)).toEqual({
      ok: false,
      error: "network_error",
    });
    expect(await requestRoomCreation(request, unknown as unknown as typeof fetch)).toEqual({
      ok: false,
      error: "network_error",
    });
  });
});

describe("Room sharing", () => {
  it("builds the join link from the page origin and Join Code", () => {
    expect(buildJoinLink("https://aptiquiz.example.test", "ABC234")).toBe(
      "https://aptiquiz.example.test/join/ABC234",
    );
  });

  it("names the Room's College in the invite", () => {
    expect(buildRoomInvite("Test College", "ABC234")).toContain("Test College");
    expect(buildRoomInvite("Test College", "ABC234")).toContain("ABC234");
  });
});

describe("error messages", () => {
  it("gives every failure a readable message", () => {
    expect(describeCreateRoomFailure("game_server_unavailable")).toMatch(/try again/i);
    expect(describeCreateRoomFailure("question_set_not_found")).toMatch(/Question Set/);
    expect(describeRoomError("room_not_found")).toMatch(/Game Server/);
    expect(describeRoomError("not_room_host")).toMatch(/Host/);
  });
});
