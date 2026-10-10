import type { RoundView, SocketTicketSubject } from "@aptiquiz/contracts";
import {
  connectAs,
  join,
  roomA,
  roundRoom,
  settle,
  startServerWithRooms,
  type TestServer,
  type TestServerOptions,
  type TestSocket,
} from "./room-harness.js";
import { openRound } from "./round-harness.js";

export interface JoinedParticipant {
  readonly socket: TestSocket;
  readonly participantId: string;
  readonly resumeToken: string;
}

export interface JoinOptions {
  readonly user?: SocketTicketSubject;
  readonly joinCode?: string;
}

/** Joins on a new socket and keeps the Resume Token from the acknowledgement. */
export async function joinWithToken(
  port: number,
  displayName: string,
  options: JoinOptions = {},
): Promise<JoinedParticipant> {
  const socket = await connectAs(port, options.user);
  const joined = await join(socket, displayName, options.joinCode ?? roomA.joinCode);

  if (!joined.ok) {
    throw new Error(`${displayName} could not join: ${joined.error}`);
  }

  return {
    socket,
    participantId: joined.participant.participantId,
    resumeToken: joined.resumeToken,
  };
}

export function resume(socket: TestSocket, resumeToken: string, joinCode = roomA.joinCode) {
  return socket.emitWithAck("room:resume", { joinCode, resumeToken });
}

/** Reconnects on a fresh socket, as a browser refresh would, after the old socket is gone. */
export async function reconnect(
  port: number,
  old: TestSocket,
  user?: SocketTicketSubject,
): Promise<TestSocket> {
  old.disconnect();
  await settle();
  return connectAs(port, user);
}

export interface SeatedParticipant extends JoinedParticipant {
  /** The view the Participant received when the first Round opened. */
  readonly round: RoundView;
}

export interface ResumableTable {
  readonly testServer: TestServer;
  readonly host: TestSocket;
  readonly asha: SeatedParticipant;
  readonly ravi: SeatedParticipant;
}

/**
 * Opens Question 0 of the Round Room for Asha, a Guest, and Ravi, a Guest unless `raviUser` signs
 * him in. Both hold Resume Tokens.
 */
export async function openResumableTable(
  options: TestServerOptions = {},
  raviUser?: SocketTicketSubject,
): Promise<ResumableTable> {
  const testServer = await startServerWithRooms(options, roundRoom);
  const { joinCode } = roundRoom;
  const asha = await joinWithToken(testServer.port, "Asha", { joinCode });
  const ravi = await joinWithToken(testServer.port, "Ravi", { joinCode, user: raviUser });
  const { host, rounds } = await openRound(testServer, [asha, ravi]);
  const [ashaRound, raviRound] = rounds;

  if (ashaRound === undefined || raviRound === undefined) {
    throw new Error("the Round did not open");
  }

  return {
    testServer,
    host,
    asha: { ...asha, round: ashaRound },
    ravi: { ...ravi, round: raviRound },
  };
}
