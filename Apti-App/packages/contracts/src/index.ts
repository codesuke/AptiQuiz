import { z } from "zod";

const timestampSchema = z.number().int().nonnegative();

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, "Room codes contain six unambiguous letters or numbers.");

export const displayNameSchema = z.string().trim().min(2).max(32);

export const chooseHomeCollegeSchema = z.object({ collegeId: z.string().min(1) });

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

export const SOCKET_TICKET_AUDIENCE = "aptiquiz-game-server";

export const userRoleSchema = z.enum(["user", "admin"]);

export const socketTicketSubjectSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
  homeCollegeId: z.string().min(1).nullable(),
  emailVerified: z.boolean(),
});

export const socketTicketClaimsSchema = socketTicketSubjectSchema.extend({
  issuedAt: timestampSchema,
  expiresAt: timestampSchema,
  audience: z.literal(SOCKET_TICKET_AUDIENCE),
});

export const socketHandshakeAuthSchema = z.object({
  ticket: z.string().min(1).optional(),
});

export const socketHandshakeErrorCodeSchema = z.enum([
  "socket_ticket_expired",
  "socket_ticket_invalid",
]);

export const connectionIdentitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("guest") }),
  socketTicketSubjectSchema
    .pick({ userId: true, role: true, emailVerified: true })
    .extend({ kind: z.literal("user") }),
]);

export const serverReadySchema = z.object({
  connectionId: z.string().min(1),
  serverTime: timestampSchema,
  identity: connectionIdentitySchema,
});

export type TimePing = z.infer<typeof timePingSchema>;
export type TimePingResponse = z.infer<typeof timePingResponseSchema>;
export type ServerReady = z.infer<typeof serverReadySchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type SocketTicketSubject = z.infer<typeof socketTicketSubjectSchema>;
export type SocketTicketClaims = z.infer<typeof socketTicketClaimsSchema>;
export type SocketHandshakeAuth = z.infer<typeof socketHandshakeAuthSchema>;
export type SocketHandshakeErrorCode = z.infer<typeof socketHandshakeErrorCodeSchema>;
export type ConnectionIdentity = z.infer<typeof connectionIdentitySchema>;

export interface ClientToServerEvents {
  "time:ping": (payload: TimePing, acknowledge: (response: TimePingResponse) => void) => void;
}

export interface ServerToClientEvents {
  "server:ready": (payload: ServerReady) => void;
}

export type InterServerEvents = Record<never, never>;

export interface SocketData {
  connectionId: string;
  identity: ConnectionIdentity;
}
