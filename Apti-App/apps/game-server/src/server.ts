import { createServer, type Server as HttpServer } from "node:http";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@aptiquiz/contracts";
import { ROOM_REGISTRATION_PATH, timePingSchema } from "@aptiquiz/contracts";
import type { Logger } from "pino";
import { Server as SocketServer } from "socket.io";
import { safeAcknowledge } from "./acknowledgement.js";
import type { GameServerConfig } from "./config.js";
import { identifyConnection } from "./handshake.js";
import { registerRoomHandlers } from "./room-handlers.js";
import { handleRoomRegistration } from "./room-registration.js";
import type { RoomStore } from "./room-store.js";
import { createRoomRegistry } from "./rooms.js";

export interface RunningGameServer {
  readonly httpServer: HttpServer;
  listen(): Promise<number>;
  close(): Promise<void>;
}

export interface GameServerDependencies {
  readonly logger: Logger;
  readonly roomStore: RoomStore;
  /** Server clock for every game time; tests replace it to control Round timing. */
  readonly now?: (() => number) | undefined;
}

export function createGameServer(
  config: GameServerConfig,
  dependencies: GameServerDependencies,
): RunningGameServer {
  const { logger, roomStore, now = Date.now } = dependencies;
  const registry = createRoomRegistry({
    store: roomStore,
    logger,
    roundDurationMs: config.roundDurationMs,
    now,
  });
  const httpServer = createServer((request, response) => {
    if (request.method === "POST" && request.url === ROOM_REGISTRATION_PATH) {
      handleRoomRegistration(request, response, {
        registry,
        secret: config.gameServerSecret,
        logger,
      }).catch((error: unknown) => {
        logger.error({ err: error }, "room registration failed");
        response.destroy();
      });
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", serverTime: now() }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: config.webOrigin,
      methods: ["GET", "POST"],
    },
  });

  // Ticket expiry uses the wall clock: the web server signs tickets against real time.
  io.use(async (socket, next) => {
    const handshake = await identifyConnection(
      socket.handshake.auth,
      config.gameServerSecret,
      Date.now(),
    );

    if (!handshake.ok) {
      logger.info({ connectionId: socket.id, error: handshake.error }, "handshake refused");
      next(new Error(handshake.error));
      return;
    }

    socket.data.identity = handshake.identity;
    next();
  });

  io.on("connection", (socket) => {
    const { identity } = socket.data;
    socket.data.connectionId = socket.id;
    logger.info({ connectionId: socket.id, identity: identity.kind }, "player transport connected");
    socket.emit("server:ready", { connectionId: socket.id, serverTime: now(), identity });

    socket.on("time:ping", (payload, callback) => {
      const acknowledge = safeAcknowledge(callback);
      const parsed = timePingSchema.safeParse(payload);

      if (!parsed.success) {
        acknowledge({ ok: false, error: "invalid_time_ping" });
        return;
      }

      acknowledge({
        ok: true,
        clientSentAt: parsed.data.clientSentAt,
        serverReceivedAt: now(),
      });
    });

    registerRoomHandlers(socket, { io, registry, store: roomStore, logger });

    socket.on("disconnect", (reason) => {
      logger.info({ connectionId: socket.id, reason }, "player transport disconnected");
    });
  });

  return {
    httpServer,
    listen: () =>
      new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(config.port, () => {
          httpServer.off("error", reject);
          const address = httpServer.address();
          const port = typeof address === "object" && address !== null ? address.port : config.port;
          resolve(port);
        });
      }),
    close: () =>
      new Promise((resolve) => {
        io.close(() => resolve());
      }),
  };
}
