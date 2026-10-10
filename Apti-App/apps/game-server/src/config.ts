const DEFAULT_PORT = 3001;
const DEFAULT_WEB_ORIGIN = "http://localhost:3000";

export interface GameServerConfig {
  readonly port: number;
  readonly webOrigin: string;
  readonly logLevel: string;
}

export function readGameServerConfig(environment: NodeJS.ProcessEnv): GameServerConfig {
  const configuredPort = environment.GAME_SERVER_PORT;
  const port = configuredPort === undefined ? DEFAULT_PORT : Number.parseInt(configuredPort, 10);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("GAME_SERVER_PORT must be an integer between 0 and 65535");
  }

  return {
    port,
    webOrigin: environment.GAME_SERVER_ORIGIN ?? DEFAULT_WEB_ORIGIN,
    logLevel: environment.LOG_LEVEL ?? "info",
  };
}
