import type { IncomingMessage, ServerResponse } from "node:http";
import { type RoomRegistrationResponse, roomRegistrationRequestSchema } from "@aptiquiz/contracts";
import { verifyRoomRegistration } from "@aptiquiz/socket-ticket";
import type { Logger } from "pino";
import type { RoomRegistry } from "./rooms.js";

/** Room registrations carry the Question snapshot, including optional media metadata. */
export const MAX_REGISTRATION_BODY_BYTES = 2 * 1024 * 1024;

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_CONFLICT = 409;
const HTTP_PAYLOAD_TOO_LARGE = 413;

type BodyRead = { readonly ok: true; readonly body: string } | { readonly ok: false };

interface RegistrationDependencies {
  readonly registry: RoomRegistry;
  readonly secret: string;
  readonly logger: Logger;
}

export async function handleRoomRegistration(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: RegistrationDependencies,
): Promise<void> {
  if (declaresOversizedBody(request)) {
    sendPayloadTooLarge(response);
    return;
  }

  const bodyRead = await readLimitedBody(request, MAX_REGISTRATION_BODY_BYTES);

  if (!bodyRead.ok) {
    sendPayloadTooLarge(response);
    return;
  }

  const parsed = roomRegistrationRequestSchema.safeParse(parseJson(bodyRead.body));

  if (!parsed.success) {
    sendRegistrationResponse(response, HTTP_BAD_REQUEST, {
      ok: false,
      error: "invalid_registration",
    });
    return;
  }

  const verification = await verifyRoomRegistration(
    parsed.data.registration,
    dependencies.secret,
    Date.now(),
  );

  if (!verification.ok) {
    dependencies.logger.warn({ reason: verification.reason }, "room registration refused");
    sendRegistrationResponse(response, HTTP_UNAUTHORIZED, { ok: false, error: "unauthorized" });
    return;
  }

  const { roomId } = verification.registration;
  const registered = dependencies.registry.register(verification.registration);

  if (!registered.ok) {
    sendRegistrationResponse(response, HTTP_CONFLICT, { ok: false, error: registered.error });
    return;
  }

  dependencies.logger.info({ roomId }, "room registered");
  sendRegistrationResponse(response, HTTP_OK, { ok: true, roomId });
}

/** Refuses early on the declared length; the streaming cap still guards chunked bodies. */
function declaresOversizedBody(request: IncomingMessage): boolean {
  const declaredBytes = Number(request.headers["content-length"]);
  return Number.isFinite(declaredBytes) && declaredBytes > MAX_REGISTRATION_BODY_BYTES;
}

function sendPayloadTooLarge(response: ServerResponse): void {
  response.writeHead(HTTP_PAYLOAD_TOO_LARGE, {
    "content-type": "application/json",
    connection: "close",
  });
  response.end(JSON.stringify({ error: "payload_too_large" }));
}

function sendRegistrationResponse(
  response: ServerResponse,
  status: number,
  body: RoomRegistrationResponse,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readLimitedBody(request: IncomingMessage, maxBytes: number): Promise<BodyRead> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    const onData = (chunk: Buffer) => {
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        request.off("data", onData);
        request.resume();
        resolve({ ok: false });
        return;
      }

      chunks.push(chunk);
    };

    request.on("data", onData);
    request.once("end", () => resolve({ ok: true, body: Buffer.concat(chunks).toString("utf8") }));
    request.once("error", reject);
  });
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}
