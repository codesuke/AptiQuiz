import type { CreateRoomRequest, RoomRegistration } from "@aptiquiz/contracts";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRoomsPost, type HostedRoom, type RoomsAccess } from "./rooms-handler";

const idempotencyKey = "0b7a8c3e-6f0e-4d4a-9a55-5b1f7f0f6e01";
const host = { id: "host_1" };

const registration: RoomRegistration = {
  roomId: "room_1",
  joinCode: "ABC234",
  hostUserId: host.id,
  college: { id: "college_1", name: "Test College" },
  questionSetTitle: "Starter set",
  questions: [
    {
      text: "2 + 2?",
      options: [
        { id: "a", text: "4" },
        { id: "b", text: "5" },
      ],
      correctOptionId: "a",
      topic: "Arithmetic",
      difficulty: "EASY",
    },
  ],
};
const lobbyRoom: HostedRoom = {
  roomId: "room_1",
  joinCode: "ABC234",
  status: "LOBBY",
  registration,
};

function postRequest(body: unknown) {
  return new Request("http://localhost:3000/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = { questionSetId: "set_1", idempotencyKey };

function handlerWith(
  overrides: Partial<{
    access: RoomsAccess;
    homeCollegeId: string | null;
    room: HostedRoom | null;
    registered: boolean;
  }> = {},
) {
  const createRoom = vi.fn(
    async (_hostId: string, _request: CreateRoomRequest, _collegeId: string) =>
      overrides.room === undefined ? lobbyRoom : overrides.room,
  );
  const registerRoom = vi.fn(async (_registration: RoomRegistration) => ({
    ok: overrides.registered ?? true,
  }));
  const post = createRoomsPost({
    getSessionAccess: async () => overrides.access ?? { kind: "active", user: host },
    getHomeCollegeId: async () =>
      overrides.homeCollegeId === undefined ? "college_1" : overrides.homeCollegeId,
    createRoom,
    registerRoom,
  });
  return { post, createRoom, registerRoom };
}

async function errorOf(response: Response) {
  return ((await response.json()) as { error: string }).error;
}

describe("POST /api/rooms", () => {
  it("refuses a Guest with 401 and a suspended User with 403", async () => {
    const guest = handlerWith({ access: { kind: "guest" } });
    const suspended = handlerWith({ access: { kind: "suspended" } });

    const guestResponse = await guest.post(postRequest(validBody));
    const suspendedResponse = await suspended.post(postRequest(validBody));

    expect(guestResponse.status).toBe(401);
    expect(await errorOf(guestResponse)).toBe("unauthorized");
    expect(suspendedResponse.status).toBe(403);
    expect(await errorOf(suspendedResponse)).toBe("account_suspended");
    expect(guest.createRoom).not.toHaveBeenCalled();
    expect(suspended.createRoom).not.toHaveBeenCalled();
  });

  it("asks a User without a Home College to choose one", async () => {
    const { post, createRoom } = handlerWith({ homeCollegeId: null });

    const response = await post(postRequest(validBody));

    expect(response.status).toBe(409);
    expect(await errorOf(response)).toBe("home_college_required");
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and invalid bodies with 400", async () => {
    const { post, createRoom } = handlerWith();

    for (const body of [
      "{not json",
      { questionSetId: "set_1" },
      { questionSetId: "set_1", idempotencyKey: "not-a-uuid" },
      { questionSetId: "", idempotencyKey },
    ]) {
      const response = await post(postRequest(body));
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toBe("invalid_request");
    }
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("returns 404 for a Question Set the Host cannot read", async () => {
    const { post, registerRoom } = handlerWith({ room: null });

    const response = await post(postRequest(validBody));

    expect(response.status).toBe(404);
    expect(await errorOf(response)).toBe("question_set_not_found");
    expect(registerRoom).not.toHaveBeenCalled();
  });

  it("creates the Room under the Home College, registers it, and returns its Join Code", async () => {
    const { post, createRoom, registerRoom } = handlerWith();

    const response = await post(postRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ roomId: "room_1", joinCode: "ABC234" });
    expect(createRoom).toHaveBeenCalledWith(host.id, validBody, "college_1");
    expect(registerRoom).toHaveBeenCalledWith(registration);
  });

  it("reports 502 when the Game Server does not accept the Room, and re-registers on retry", async () => {
    let registered = false;
    const createRoom = vi.fn(async () => lobbyRoom);
    const registerRoom = vi.fn(async () => ({ ok: registered }));
    const post = createRoomsPost({
      getSessionAccess: async () => ({ kind: "active", user: host }),
      getHomeCollegeId: async () => "college_1",
      createRoom,
      registerRoom,
    });

    const failed = await post(postRequest(validBody));
    expect(failed.status).toBe(502);
    expect(await errorOf(failed)).toBe("game_server_unavailable");

    registered = true;
    const retried = await post(postRequest(validBody));
    expect(retried.status).toBe(200);
    expect(await retried.json()).toEqual({ roomId: "room_1", joinCode: "ABC234" });
    expect(createRoom).toHaveBeenCalledTimes(2);
    expect(registerRoom).toHaveBeenCalledTimes(2);
  });

  it("returns a Room that already left the Lobby without registering it again", async () => {
    const { post, registerRoom } = handlerWith({ room: { ...lobbyRoom, status: "RUNNING" } });

    const response = await post(postRequest(validBody));

    expect(response.status).toBe(200);
    expect(registerRoom).not.toHaveBeenCalled();
  });
});
