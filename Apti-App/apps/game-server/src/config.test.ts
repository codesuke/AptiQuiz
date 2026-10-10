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

  it("opens 30-second Rounds", () => {
    expect(readGameServerConfig(validEnvironment).roundDurationMs).toBe(30_000);
  });

  it("compensates at most 100 ms of delay and scores in 100 ms buckets", () => {
    expect(readGameServerConfig(validEnvironment)).toMatchObject({
      maxDelayCompensationMs: 100,
      scoreBucketMs: 100,
    });
  });

  it("samples latency every 2 seconds over the last 5 acknowledged pings", () => {
    expect(readGameServerConfig(validEnvironment).latencySampling).toEqual({
      intervalMs: 2_000,
      windowSize: 5,
      timeoutMs: 2_000,
    });
  });

  it("gives a dropped Participant 5 seconds to reconnect before early Round closure", () => {
    expect(readGameServerConfig(validEnvironment).reconnectGraceMs).toBe(5_000);
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
