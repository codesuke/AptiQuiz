import { randomUUID } from "node:crypto";
import { type CreateRoomRequest, createRoomResponseSchema } from "@aptiquiz/contracts";
import { type RoomSetup, STARTER_QUESTION_SET_ID } from "./config.js";

export interface HostAccess {
  roomId: string;
  hostTicket: string;
}

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

const SETUP_TIMEOUT_MS = 15_000;

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  cookie: string,
  body: unknown,
  step: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SETUP_TIMEOUT_MS),
    });
  } catch {
    throw new SetupError(`${step}: the web application did not respond`);
  }
  if (!response.ok) {
    const code = await response
      .json()
      .then((payload: unknown) =>
        typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : "unknown_error",
      )
      .catch(() => "unknown_error");
    throw new SetupError(`${step}: HTTP ${response.status} ${code}`);
  }
  return response.json();
}

/** Creates a fresh starter Room and a Host Socket Ticket through the authorized web path. */
export async function obtainHostAccess(
  setup: RoomSetup,
  fetchImpl: typeof fetch = fetch,
): Promise<HostAccess> {
  if (setup.kind === "supplied") {
    return { roomId: setup.roomId, hostTicket: setup.hostTicket };
  }

  const request: CreateRoomRequest = {
    questionSetId: STARTER_QUESTION_SET_ID,
    idempotencyKey: randomUUID(),
  };
  const created = createRoomResponseSchema.safeParse(
    await postJson(
      fetchImpl,
      `${setup.webUrl}/api/rooms`,
      setup.hostCookie,
      request,
      "Room creation",
    ),
  );
  if (!created.success) throw new SetupError("Room creation: unexpected response shape");

  const ticketBody = await postJson(
    fetchImpl,
    `${setup.webUrl}/api/socket-ticket`,
    setup.hostCookie,
    {},
    "Host Socket Ticket",
  );
  const ticket =
    typeof ticketBody === "object" && ticketBody !== null && "ticket" in ticketBody
      ? ticketBody.ticket
      : null;
  if (typeof ticket !== "string" || ticket.length === 0) {
    throw new SetupError("Host Socket Ticket: unexpected response shape");
  }
  return { roomId: created.data.roomId, hostTicket: ticket };
}
