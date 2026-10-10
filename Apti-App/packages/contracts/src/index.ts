import { z } from "zod";

const timestampSchema = z.number().int().nonnegative();

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, "Room codes contain six unambiguous letters or numbers.");

export const displayNameSchema = z.string().trim().min(2).max(32);

export const timePingSchema = z.object({
  clientSentAt: timestampSchema,
});

export const timePingResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    clientSentAt: timestampSchema,
    serverReceivedAt: timestampSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export const serverReadySchema = z.object({
  connectionId: z.string().min(1),
  serverTime: timestampSchema,
});

export type TimePing = z.infer<typeof timePingSchema>;
export type TimePingResponse = z.infer<typeof timePingResponseSchema>;
export type ServerReady = z.infer<typeof serverReadySchema>;

export interface ClientToServerEvents {
  "time:ping": (payload: TimePing, acknowledge: (response: TimePingResponse) => void) => void;
}

export interface ServerToClientEvents {
  "server:ready": (payload: ServerReady) => void;
}

export type InterServerEvents = Record<never, never>;

export interface SocketData {
  connectionId: string;
}
