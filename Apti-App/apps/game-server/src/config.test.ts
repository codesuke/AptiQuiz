import { describe, expect, it } from "vitest";
import { readGameServerConfig } from "./config.js";

const gameServerSecret = "test-secret-with-at-least-32-characters";

describe("game server config", () => {
  it("reads the Socket Ticket secret", () => {
    expect(readGameServerConfig({ GAME_SERVER_SECRET: gameServerSecret })).toMatchObject({
      gameServerSecret,
    });
  });

  it("refuses to start without GAME_SERVER_SECRET", () => {
    expect(() => readGameServerConfig({})).toThrow("GAME_SERVER_SECRET");
  });

  it("refuses a GAME_SERVER_SECRET shorter than 32 characters", () => {
    expect(() => readGameServerConfig({ GAME_SERVER_SECRET: "too-short" })).toThrow(
      "GAME_SERVER_SECRET",
    );
  });
});
