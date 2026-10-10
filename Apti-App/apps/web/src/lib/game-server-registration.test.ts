import type { RoomRegistration } from "@aptiquiz/contracts";
import { verifyRoomRegistration } from "@aptiquiz/socket-ticket";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRoomRegistrar, resolveRoomRegistrationUrl } from "./game-server-registration";

const secret = "test-secret-with-at-least-thirty-two-characters";
const now = Date.UTC(2026, 9, 10, 12);
const registration: RoomRegistration = {
  roomId: "room_1",
  joinCode: "ABC234",
  hostUserId: "user_1",
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

function registrarWith(respond: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchRegistration = vi.fn(respond);
  const registerRoom = createRoomRegistrar({
    fetch: fetchRegistration as unknown as typeof fetch,
    getRegistrationUrl: () => "http://game.internal:3001/internal/rooms",
    getSecret: () => secret,
    now: () => now,
  });
  return { fetchRegistration, registerRoom };
}

describe("registerRoom", () => {
  it("posts a signed Room registration the Game Server can verify", async () => {
    const { fetchRegistration, registerRoom } = registrarWith(async () =>
      Response.json({ ok: true, roomId: "room_1" }),
    );

    expect(await registerRoom(registration)).toEqual({ ok: true });

    const [url, init] = fetchRegistration.mock.calls[0] ?? [];
    expect(url).toBe("http://game.internal:3001/internal/rooms");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    const verified = await verifyRoomRegistration(body.registration, secret, now);
    expect(verified).toEqual({ ok: true, registration });
  });

  it("fails when the Game Server refuses the registration", async () => {
    const { registerRoom } = registrarWith(async () =>
      Response.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    );

    expect(await registerRoom(registration)).toEqual({ ok: false });
  });

  it("fails when the Game Server is unreachable or replies with an unknown shape", async () => {
    const unreachable = registrarWith(async () => {
      throw new TypeError("fetch failed");
    });
    const malformed = registrarWith(async () => Response.json({ hello: "world" }));
    const wrongRoom = registrarWith(async () => Response.json({ ok: true, roomId: "room_2" }));

    expect(await unreachable.registerRoom(registration)).toEqual({ ok: false });
    expect(await malformed.registerRoom(registration)).toEqual({ ok: false });
    expect(await wrongRoom.registerRoom(registration)).toEqual({ ok: false });
  });
});

describe("resolveRoomRegistrationUrl", () => {
  it("prefers the internal Game Server URL and falls back to the public one", () => {
    expect(
      resolveRoomRegistrationUrl({
        GAME_SERVER_INTERNAL_URL: "http://game-server:3001/",
        NEXT_PUBLIC_GAME_SERVER_URL: "https://game.example.test",
      }),
    ).toBe("http://game-server:3001/internal/rooms");
    expect(
      resolveRoomRegistrationUrl({
        GAME_SERVER_INTERNAL_URL: "",
        NEXT_PUBLIC_GAME_SERVER_URL: "https://game.example.test",
      }),
    ).toBe("https://game.example.test/internal/rooms");
  });

  it("refuses to run without a Game Server URL", () => {
    expect(() => resolveRoomRegistrationUrl({})).toThrow(/Game Server URL/);
  });
});
