import pino from "pino";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer, type RunningGameServer } from "./server.js";

let server: RunningGameServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("game server", () => {
  it("reports readiness without exposing game state", async () => {
    server = createGameServer(
      { port: 0, webOrigin: "http://localhost:3000", logLevel: "silent" },
      pino({ level: "silent" }),
    );
    const port = await server.listen();
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });
});
