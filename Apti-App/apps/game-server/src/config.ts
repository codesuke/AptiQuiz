const DEFAULT_PORT = 3001;
const DEFAULT_WEB_ORIGIN = "http://localhost:3000";
const MINIMUM_SECRET_LENGTH = 32;

export interface GameServerConfig {
  readonly port: number;
  readonly webOrigin: string;
  readonly logLevel: string;
  readonly gameServerSecret: string;
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
    gameServerSecret: readGameServerSecret(environment.GAME_SERVER_SECRET),
  };
}

function readGameServerSecret(secret: string | undefined): string {
  if (secret === undefined || secret.length < MINIMUM_SECRET_LENGTH) {
    throw new Error(`GAME_SERVER_SECRET must contain at least ${MINIMUM_SECRET_LENGTH} characters`);
  }

  return secret;
}
