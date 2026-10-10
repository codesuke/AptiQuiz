import { describe, expect, it } from "vitest";
import { ConfigError, readConfig, secretsOf } from "./config.js";

const webEnv = { SIMULATOR_HOST_COOKIE: "session=abc" };

describe("readConfig", () => {
  it("defaults to 50 Participants on the local servers", () => {
    const config = readConfig(webEnv);
    expect(config.participantCount).toBe(50);
    expect(config.gameServerUrl).toBe("http://localhost:3001");
    expect(config.setup).toEqual({
      kind: "web",
      webUrl: "http://localhost:3000",
      hostCookie: "session=abc",
    });
  });

  it.each(["0", "51", "abc", "1.5", "-3", ""])("rejects SIMULATED_PLAYERS=%j", (value) => {
    expect(() => readConfig({ ...webEnv, SIMULATED_PLAYERS: value })).toThrow(ConfigError);
  });

  it("accepts a smaller diagnostic count", () => {
    expect(readConfig({ ...webEnv, SIMULATED_PLAYERS: "5" }).participantCount).toBe(5);
  });

  it("reduces target URLs to their origin so no credentials are kept", () => {
    const config = readConfig({
      ...webEnv,
      SIMULATOR_URL: "https://user:pw@game.example.com/path?token=x",
    });
    expect(config.gameServerUrl).toBe("https://game.example.com");
  });

  it("rejects a non-http target without echoing it", () => {
    expect(() => readConfig({ ...webEnv, SIMULATOR_URL: "ftp://secret-host" })).toThrow(
      /SIMULATOR_URL must be an http\(s\) URL$/,
    );
  });

  it("requires some authorized Host setup", () => {
    expect(() => readConfig({})).toThrow(/SIMULATOR_HOST_COOKIE/);
  });

  it("accepts a supplied Room with a Host ticket, and only as a pair", () => {
    const config = readConfig({ SIMULATOR_ROOM_ID: "room1", SIMULATOR_HOST_TICKET: "tkt" });
    expect(config.setup).toEqual({ kind: "supplied", roomId: "room1", hostTicket: "tkt" });
    expect(() => readConfig({ SIMULATOR_ROOM_ID: "room1" })).toThrow(ConfigError);
  });

  it("lists the secrets of the chosen setup", () => {
    expect(secretsOf(readConfig(webEnv))).toEqual(["session=abc"]);
  });
});
