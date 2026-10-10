import { createServer, type Server as HttpServer } from "node:http";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@aptiquiz/contracts";
import { timePingSchema } from "@aptiquiz/contracts";
import type { Logger } from "pino";
import { Server as SocketServer } from "socket.io";
import type { GameServerConfig } from "./config.js";

export interface RunningGameServer {
  readonly httpServer: HttpServer;
  listen(): Promise<number>;
  close(): Promise<void>;
}

export function createGameServer(config: GameServerConfig, logger: Logger): RunningGameServer {
  const httpServer = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", serverTime: Date.now() }));
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

  io.on("connection", (socket) => {
    socket.data.connectionId = socket.id;
    logger.info({ connectionId: socket.id }, "player transport connected");
    socket.emit("server:ready", { connectionId: socket.id, serverTime: Date.now() });

    socket.on("time:ping", (payload, acknowledge) => {
      const parsed = timePingSchema.safeParse(payload);

      if (!parsed.success) {
        acknowledge({ ok: false, error: "invalid_time_ping" });
        return;
      }

      acknowledge({
        ok: true,
        clientSentAt: parsed.data.clientSentAt,
        serverReceivedAt: Date.now(),
      });
    });

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
