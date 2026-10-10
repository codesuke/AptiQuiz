import { describe, expect, it } from "vitest";
import { readGameServerConfig } from "./config.js";

const gameServerSecret = "test-secret-with-at-least-32-characters";
const databaseUrl = "postgresql://localhost:5432/aptiquiz-test";
const validEnvironment = { GAME_SERVER_SECRET: gameServerSecret, DATABASE_URL: databaseUrl };

describe("game server config", () => {
  it("reads the Socket Ticket secret and database URL", () => {
    expect(readGameServerConfig(validEnvironment)).toMatchObject({
      gameServerSecret,
      databaseUrl,
    });
  });

  it("refuses to start without GAME_SERVER_SECRET", () => {
    expect(() => readGameServerConfig({ DATABASE_URL: databaseUrl })).toThrow("GAME_SERVER_SECRET");
  });

  it("refuses a GAME_SERVER_SECRET shorter than 32 characters", () => {
    expect(() =>
      readGameServerConfig({ ...validEnvironment, GAME_SERVER_SECRET: "too-short" }),
    ).toThrow("GAME_SERVER_SECRET");
  });

  it("refuses to start without DATABASE_URL", () => {
    expect(() => readGameServerConfig({ GAME_SERVER_SECRET: gameServerSecret })).toThrow(
      "DATABASE_URL",
    );
  });
});
