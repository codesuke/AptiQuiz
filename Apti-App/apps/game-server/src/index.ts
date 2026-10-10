import pino from "pino";
import { readGameServerConfig } from "./config.js";
import { createDatabaseRoomStore } from "./database-room-store.js";
import { createGameServer } from "./server.js";

const config = readGameServerConfig(process.env);
const logger = pino({ level: config.logLevel });
const roomStore = createDatabaseRoomStore(config.databaseUrl);
const gameServer = createGameServer(config, logger, roomStore);

const port = await gameServer.listen();
logger.info({ port, webOrigin: config.webOrigin }, "AptiQuiz game server ready");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    logger.info({ signal }, "stopping AptiQuiz game server");
    await gameServer.close();
    await roomStore.close();
    process.exit(0);
  });
}
