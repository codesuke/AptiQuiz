import { describe, expect, it } from "vitest";
import { readBotsConfig } from "./bots-config.js";
import { ConfigError } from "./config.js";

describe("readBotsConfig", () => {
  it("requires a Join Code and normalizes it", () => {
    expect(() => readBotsConfig({})).toThrow(ConfigError);
    expect(readBotsConfig({ SIMULATOR_JOIN_CODE: " abc234 " }).joinCode).toBe("ABC234");
  });

  it("defaults to the deployed Game Server and 10 bots", () => {
    const config = readBotsConfig({ SIMULATOR_JOIN_CODE: "ABC234" });
    expect(config.gameServerUrl).toBe("https://game.aptiquiz.codesuke.in");
    expect(config.botCount).toBe(10);
  });

  it.each(["0", "51", "x"])("rejects SIMULATED_PLAYERS=%s", (value) => {
    expect(() =>
      readBotsConfig({ SIMULATOR_JOIN_CODE: "ABC234", SIMULATED_PLAYERS: value }),
    ).toThrow(ConfigError);
  });

  it("rejects a skip share above 100", () => {
    expect(() =>
      readBotsConfig({ SIMULATOR_JOIN_CODE: "ABC234", BOT_SKIP_PERCENT: "101" }),
    ).toThrow(ConfigError);
  });
});
