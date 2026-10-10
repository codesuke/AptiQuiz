import "server-only";
import {
  ROOM_REGISTRATION_PATH,
  type RoomRegistration,
  roomRegistrationResponseSchema,
} from "@aptiquiz/contracts";
import { issueRoomRegistration } from "@aptiquiz/socket-ticket";
import { readGameServerSecret } from "./socket-ticket-handler";

export type RoomRegistrationOutcome = { ok: true } | { ok: false };

interface RoomRegistrarDependencies {
  fetch: typeof fetch;
  getRegistrationUrl(): string;
  getSecret(): string;
  now(): number;
}

interface GameServerUrlEnvironment {
  GAME_SERVER_INTERNAL_URL?: string | undefined;
  NEXT_PUBLIC_GAME_SERVER_URL?: string | undefined;
}

// A Host waits on this request, so an unresponsive Game Server must fail fast.
const REGISTRATION_TIMEOUT_MS = 5_000;

export function resolveRoomRegistrationUrl(environment: GameServerUrlEnvironment): string {
  const baseUrl = environment.GAME_SERVER_INTERNAL_URL || environment.NEXT_PUBLIC_GAME_SERVER_URL;
  if (!baseUrl) {
    throw new Error("A Game Server URL is required: set GAME_SERVER_INTERNAL_URL");
  }
  return new URL(ROOM_REGISTRATION_PATH, baseUrl).toString();
}

/** Hands a Room to the Game Server. Registration is idempotent, so callers may repeat it. */
export function createRoomRegistrar(dependencies: RoomRegistrarDependencies) {
  return async function registerRoom(
    registration: RoomRegistration,
  ): Promise<RoomRegistrationOutcome> {
    const token = await issueRoomRegistration(
      registration,
      dependencies.getSecret(),
      dependencies.now(),
    );
    // The token and secret are never logged; the URL carries no credentials.
    let url = "unresolved";
    try {
      url = dependencies.getRegistrationUrl();
      const response = await dependencies.fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registration: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(REGISTRATION_TIMEOUT_MS),
      });
      const payload: unknown = await response.json();
      const parsed = roomRegistrationResponseSchema.safeParse(payload);
      const accepted =
        parsed.success && parsed.data.ok && parsed.data.roomId === registration.roomId;
      if (!accepted) {
        console.error("Game Server refused Room registration", {
          roomId: registration.roomId,
          url,
          status: response.status,
          body: payload,
        });
      }
      return { ok: accepted };
    } catch (error: unknown) {
      console.error("Game Server Room registration failed", {
        roomId: registration.roomId,
        url,
        error,
      });
      return { ok: false };
    }
  };
}

export const registerRoom = createRoomRegistrar({
  fetch: (input, init) => fetch(input, init),
  getRegistrationUrl: () =>
    resolveRoomRegistrationUrl({
      GAME_SERVER_INTERNAL_URL: process.env.GAME_SERVER_INTERNAL_URL,
      NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL,
    }),
  getSecret: readGameServerSecret,
  now: Date.now,
});
