import { createHash, randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import {
  MAX_ROOM_PARTICIPANTS,
  type RoundView,
  roomResumeResponseSchema,
  type SocketTicketSubject,
} from "@aptiquiz/contracts";
import pino from "pino";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  hostRoom,
  hostUser,
  join,
  nextRound,
  otherUser,
  recordEveryEvent,
  roomA,
  roomB,
  roundRoom,
  settle,
  startRoom,
  startServerWithRooms,
  startWithRooms,
  stopTestServer,
  type TestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import { CORRECT_OPTION_TEXT, openRound, optionIdFor, submit } from "./testing/round-harness.js";

const MINIMUM_TOKEN_LENGTH = 32;

const secondUser: SocketTicketSubject = {
  ...otherUser,
  userId: "second_user",
  homeCollegeId: "college_second",
};

afterEach(stopTestServer);

interface JoinedGuest {
  readonly socket: TestSocket;
  readonly participantId: string;
  readonly resumeToken: string;
}

async function joinWithToken(
  port: number,
  displayName: string,
  options: { readonly user?: SocketTicketSubject; readonly joinCode?: string } = {},
): Promise<JoinedGuest> {
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

function resume(socket: TestSocket, resumeToken: string, joinCode = roomA.joinCode) {
  return socket.emitWithAck("room:resume", { joinCode, resumeToken });
}

/** Reconnects on a fresh socket, as a browser refresh would, after the old socket is gone. */
async function reconnect(
  port: number,
  old: TestSocket,
  user?: SocketTicketSubject,
): Promise<TestSocket> {
  old.disconnect();
  await settle();
  return connectAs(port, user);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function captureLogs() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { logger: pino({ level: "trace" }, destination), lines };
}

describe("Resume Token issue", () => {
  it("returns a token only in the join acknowledgement and stores only its hash", async () => {
    const { logger, lines } = captureLogs();
    const { port, store } = await startServerWithRooms({ logger }, roomA);
    const host = await hostRoom(port, roomA.roomId);
    const watcher = await connectAs(port);
    await join(watcher, "Watcher");
    const received: unknown[] = [];
    const joiner = await connectAs(port);
    recordEveryEvent([host, watcher, joiner], received);
    const key = randomUUID();

    const first = await join(joiner, "Asha", roomA.joinCode, key);
    const retried = await join(joiner, "Asha", roomA.joinCode, key);
    await settle();

    if (!first.ok || !retried.ok) {
      throw new Error("the join failed");
    }
    expect(first.resumeToken.length).toBeGreaterThanOrEqual(MINIMUM_TOKEN_LENGTH);
    expect(retried.resumeToken).toBe(first.resumeToken);
    expect(received.length).toBeGreaterThan(0);
    expect(JSON.stringify(received)).not.toContain(first.resumeToken);
    expect(lines.join("")).not.toContain(first.resumeToken);
    const stored = store.participants.find((record) => record.idempotencyKey === key);
    expect(stored?.resumeTokenHash).toBe(sha256(first.resumeToken));
    expect(JSON.stringify(store.participants)).not.toContain(first.resumeToken);
  });

  it("gives each Participant a different token", async () => {
    const { port } = await startWithRooms(roomA);
    const asha = await joinWithToken(port, "Asha");
    const ravi = await joinWithToken(port, "Ravi");

    expect(asha.resumeToken).not.toBe(ravi.resumeToken);
  });
});

describe("room:resume", () => {
  it("returns a Guest to the same Participant without a second join", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await hostRoom(port, roomA.roomId);
    const asha = await joinWithToken(port, "Asha");
    await joinWithToken(port, "Ravi");
    await settle();
    const lobbiesAfterJoins: unknown[] = [];
    host.on("room:lobby", (lobby) => lobbiesAfterJoins.push(lobby));
    const fresh = await reconnect(port, asha.socket);

    const resumed = await resume(fresh, asha.resumeToken);
    await settle();

    expect(roomResumeResponseSchema.parse(resumed)).toEqual(resumed);
    expect(resumed).toMatchObject({
      ok: true,
      participant: { participantId: asha.participantId, displayName: "Asha", isGuest: true },
      lobby: { phase: "LOBBY", participants: [{ displayName: "Asha" }, { displayName: "Ravi" }] },
      round: null,
      score: 0,
    });
    expect(lobbiesAfterJoins).toEqual([]);
  });

  it("sends later Room events to the resumed socket", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await hostRoom(port, roomA.roomId);
    const asha = await joinWithToken(port, "Asha");
    const fresh = await reconnect(port, asha.socket);
    await resume(fresh, asha.resumeToken);
    const lobbySeen = new Promise((resolve) => fresh.once("room:lobby", resolve));

    await joinWithToken(port, "Ravi");
    await expect(lobbySeen).resolves.toMatchObject({ participants: [{}, {}] });

    const round = nextRound(fresh);
    await startRoom(host);
    await expect(round).resolves.toMatchObject({ phase: "QUESTION_OPEN", questionIndex: 0 });
  });

  it("returns a signed-in User with a fresh Socket Ticket and refuses another User", async () => {
    const { port } = await startWithRooms(roomA);
    const ravi = await joinWithToken(port, "Ravi", { user: otherUser });
    const fresh = await reconnect(port, ravi.socket, otherUser);

    await expect(resume(fresh, ravi.resumeToken)).resolves.toMatchObject({
      ok: true,
      participant: { participantId: ravi.participantId, isGuest: false },
    });

    const impostor = await connectAs(port, secondUser);
    const guest = await connectAs(port);
    for (const stranger of [impostor, guest]) {
      await expect(resume(stranger, ravi.resumeToken)).resolves.toEqual({
        ok: false,
        error: "invalid_resume_token",
      });
    }
  });

  it("refuses malformed, unknown, and other-Room tokens", async () => {
    const { port } = await startWithRooms(roomA, roomB);
    const inB = await joinWithToken(port, "Bina", { joinCode: roomB.joinCode });
    const socket = await connectAs(port);
    const refused = (error: string) => ({ ok: false, error });

    await expect(
      socket.emitWithAck("room:resume", { joinCode: roomA.joinCode } as never),
    ).resolves.toEqual(refused("invalid_request"));
    await expect(resume(socket, inB.resumeToken, "bad")).resolves.toEqual(
      refused("invalid_join_code"),
    );
    await expect(resume(socket, "short")).resolves.toEqual(refused("invalid_resume_token"));
    await expect(resume(socket, "x".repeat(43))).resolves.toEqual(refused("invalid_resume_token"));
    await expect(resume(socket, inB.resumeToken)).resolves.toEqual(refused("invalid_resume_token"));
    await expect(resume(socket, inB.resumeToken, "QQQ222")).resolves.toEqual(
      refused("room_not_found"),
    );
  });

  it("does not let a display name and Join Code reclaim a Guest", async () => {
    const { port } = await startWithRooms(roomA);
    const asha = await joinWithToken(port, "Asha");
    const fresh = await reconnect(port, asha.socket);

    const lookalike = await join(fresh, "Asha");

    expect(lookalike).toMatchObject({ ok: true, participant: { displayName: "Asha" } });
    expect(lookalike.ok && lookalike.participant.participantId).not.toBe(asha.participantId);
    expect(lookalike.ok && lookalike.lobby.participants).toHaveLength(2);
  });

  it("repeats an equivalent result for a repeated resume and changes nothing", async () => {
    const { port, store } = await startWithRooms(roomA);
    const asha = await joinWithToken(port, "Asha");
    const fresh = await reconnect(port, asha.socket);

    const first = await resume(fresh, asha.resumeToken);
    const second = await resume(fresh, asha.resumeToken);

    expect(second).toEqual(first);
    expect(first.ok && first.lobby.participants).toHaveLength(1);
    expect(store.participants).toHaveLength(1);
  });

  it("resumes into a full Room without taking a place", async () => {
    const { port } = await startWithRooms(roomA);
    const asha = await joinWithToken(port, "Asha");
    const filler = await connectAs(port);
    for (let index = 1; index < MAX_ROOM_PARTICIPANTS; index += 1) {
      await join(filler, `Player ${index}`);
    }
    const fresh = await reconnect(port, asha.socket);

    const resumed = await resume(fresh, asha.resumeToken);

    expect(resumed.ok && resumed.lobby.participants).toHaveLength(MAX_ROOM_PARTICIPANTS);
    await expect(join(filler, "Latecomer")).resolves.toEqual({ ok: false, error: "room_full" });
  });
});

describe("room:resume during a Match", () => {
  async function roundTable(): Promise<{
    readonly testServer: TestServer;
    readonly host: TestSocket;
    readonly asha: JoinedGuest & { readonly round: RoundView };
    readonly ravi: JoinedGuest & { readonly round: RoundView };
  }> {
    const testServer = await startServerWithRooms({}, roundRoom);
    const [asha, ravi] = await Promise.all(
      ["Asha", "Ravi"].map((name) =>
        joinWithToken(testServer.port, name, { joinCode: roundRoom.joinCode }),
      ),
    );

    if (asha === undefined || ravi === undefined) {
      throw new Error("the players did not join");
    }

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

  it("counts a resumed socket as connected, so the Round waits for its Answer", async () => {
    const { testServer, asha, ravi } = await roundTable();
    const fresh = await reconnect(testServer.port, ravi.socket);
    const resumed = await resume(fresh, ravi.resumeToken, roundRoom.joinCode);

    if (!resumed.ok || resumed.round === null) {
      throw new Error("the resume did not return the open Round");
    }
    expect(resumed.round).toEqual({ ...ravi.round, serverTime: resumed.round.serverTime });

    const reveals: RoundView[] = [];
    fresh.on("round:state", (round) => reveals.push(round));
    await submit(asha.socket, asha.round, optionIdFor(asha.round, CORRECT_OPTION_TEXT));
    await settle();
    expect(reveals).toEqual([]);

    await expect(
      submit(fresh, resumed.round, optionIdFor(resumed.round, CORRECT_OPTION_TEXT)),
    ).resolves.toMatchObject({ ok: true });
    await settle();
    expect(reveals).toMatchObject([{ phase: "QUESTION_REVEAL" }]);
  });

  it("returns only points from revealed Rounds", async () => {
    const { testServer, host, asha, ravi } = await roundTable();
    const answerCorrectly = (socket: TestSocket, round: RoundView) =>
      submit(socket, round, optionIdFor(round, CORRECT_OPTION_TEXT));
    const resumeAsha = async () => {
      const resumed = await resume(
        await connectAs(testServer.port),
        asha.resumeToken,
        roundRoom.joinCode,
      );
      return resumed.ok ? resumed.score : null;
    };

    await expect(resumeAsha()).resolves.toBe(0);
    const reveal = nextRound(asha.socket);
    await answerCorrectly(asha.socket, asha.round);
    await answerCorrectly(ravi.socket, ravi.round);
    const firstReveal = await reveal;
    const firstPoints = firstReveal.phase === "QUESTION_REVEAL" ? firstReveal.result?.points : 0;
    expect(firstPoints).toBeGreaterThan(0);
    await expect(resumeAsha()).resolves.toBe(firstPoints);

    const nextOpen = nextRound(asha.socket);
    await host.emitWithAck("room:advance", {
      roomId: roundRoom.roomId,
      idempotencyKey: randomUUID(),
    });
    const secondRound = await nextOpen;
    await expect(
      submit(asha.socket, secondRound, optionIdFor(secondRound, "4")),
    ).resolves.toMatchObject({ ok: true });

    await expect(resumeAsha()).resolves.toBe(firstPoints);
  });

  it("resumes into a finished Room with no Round", async () => {
    const testServer = await startServerWithRooms({}, roomA);
    const asha = await joinWithToken(testServer.port, "Asha");
    const host = await connectAs(testServer.port, hostUser);
    const opened = nextRound(asha.socket);
    await startRoom(host);
    await opened;
    testServer.clock.advance(60_000);
    testServer.deadlines.fireDue();
    await settle();
    await host.emitWithAck("room:advance", { roomId: roomA.roomId, idempotencyKey: randomUUID() });

    const resumed = await resume(await connectAs(testServer.port), asha.resumeToken);

    expect(resumed).toMatchObject({ ok: true, lobby: { phase: "FINISHED" }, round: null });
  });
});
