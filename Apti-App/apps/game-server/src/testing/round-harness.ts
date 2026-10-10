import { randomUUID } from "node:crypto";
import type { RoundView, SocketTicketSubject } from "@aptiquiz/contracts";
import {
  connectAs,
  hostRoom,
  join,
  nextRound,
  roundRoom,
  settle,
  startRoom,
  TEST_READY_DURATION_MS,
  type TestClock,
  type TestServer,
  type TestSocket,
} from "./room-harness.js";

/** Option texts of the first `roundRoom` Question, whose correct option is "7". */
export const CORRECT_OPTION_TEXT = "7";
export const WRONG_OPTION_TEXT = "4";

export interface PlayerOptions {
  /** The server clock moves by this much before each latency ping is acknowledged. */
  readonly roundTripMs?: number;
  readonly key?: string;
  readonly user?: SocketTicketSubject;
}

export interface Player {
  readonly socket: TestSocket;
  readonly key: string;
  readonly participantId: string;
}

export interface OpenedRound {
  readonly host: TestSocket;
  readonly rounds: readonly RoundView[];
}

/** Acknowledges every latency ping after moving the server clock, as a slow network would. */
function acknowledgePingsAfter(socket: TestSocket, clock: TestClock, roundTripMs: number): void {
  socket.on("latency:ping", (_payload, acknowledge) => {
    clock.advance(roundTripMs);
    acknowledge();
  });
}

/** Joins the Round Room and waits for the first latency ping to be answered or to time out. */
export async function joinPlayer(
  { port, clock }: TestServer,
  displayName: string,
  options: PlayerOptions = {},
): Promise<Player> {
  const socket = await connectAs(port, options.user);
  const key = options.key ?? randomUUID();

  if (options.roundTripMs !== undefined) {
    acknowledgePingsAfter(socket, clock, options.roundTripMs);
  }

  const joined = await join(socket, displayName, roundRoom.joinCode, key);

  if (!joined.ok) {
    throw new Error(`${displayName} could not join: ${joined.error}`);
  }

  await settle();
  return { socket, key, participantId: joined.participant.participantId };
}

export async function openRound(
  { port }: TestServer,
  players: readonly Pick<Player, "socket">[],
): Promise<OpenedRound> {
  const host = await hostRoom(port, roundRoom.roomId);
  const hostOpened = nextRound(host);
  const rounds = Promise.all(players.map((player) => nextRound(player.socket)));
  await startRoom(host, roundRoom.roomId);
  await hostOpened;
  return { host, rounds: await rounds };
}

export function optionIdFor(round: RoundView, text: string): string {
  const option = round.question.options.find((candidate) => candidate.text === text);

  if (option === undefined) {
    throw new Error(`no option "${text}"`);
  }

  return option.id;
}

export function submit(
  socket: TestSocket,
  round: RoundView,
  optionId: string,
  key = randomUUID(),
  questionIndex = round.questionIndex,
) {
  return socket.emitWithAck("round:answer", {
    roomId: round.roomId,
    questionIndex,
    optionId,
    idempotencyKey: key,
  });
}

export function advanceTo(clock: TestClock, serverTime: number): void {
  clock.advance(serverTime - clock.now());
}

/** Lets the server's reveal timer fire; the returned Promise includes event delivery. */
export async function finishReveal(
  server: Pick<TestServer, "clock" | "deadlines">,
  view: RoundView,
): Promise<void> {
  if (view.phase !== "QUESTION_REVEAL") throw new Error("the Round has not revealed");
  advanceTo(server.clock, view.revealEndsAt);
  server.deadlines.fireDue();
  await settle();
}

/** Runs the six-second reveal and the following three-second ready timer. */
export async function openNextAfterReveal(
  server: Pick<TestServer, "clock" | "deadlines">,
  view: RoundView,
): Promise<void> {
  await finishReveal(server, view);
  server.clock.advance(TEST_READY_DURATION_MS);
  server.deadlines.fireDue();
  await settle();
}
