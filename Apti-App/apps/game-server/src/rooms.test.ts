import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { Writable } from "node:stream";
import {
  type LobbySnapshot,
  MAX_ROOM_PARTICIPANTS,
  ROOM_REGISTRATION_PATH,
  type RoundView,
  type SocketTicketSubject,
} from "@aptiquiz/contracts";
import { issueSocketTicket, ROOM_REGISTRATION_LIFETIME_MS } from "@aptiquiz/socket-ticket";
import pino from "pino";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  emitWithoutAck,
  findFieldPaths,
  gameServerSecret,
  hostRoom,
  hostUser,
  join,
  nextRound,
  otherUser,
  postRegistration,
  ROOM_STARTED_AT,
  ROUND_OPENED_AT,
  recordEveryEvent,
  registerRoom,
  roomA,
  roomB,
  roundRoom,
  settle,
  sixOptionQuestion,
  startRoom,
  startServer,
  startWithRooms,
  stopTestServer,
  TEST_READY_DURATION_MS,
  TEST_ROUND_DURATION_MS,
  type TestSocket,
} from "./testing/room-harness.js";

const OVERSIZED_BODY_BYTES = 3 * 1024 * 1024;
const CLOCK_ADVANCE_MS = 1_234;
const PRE_REVEAL_FIELDS = ["correctOptionId", "explanation"] as const;

const userWithoutCollege: SocketTicketSubject = {
  ...otherUser,
  userId: "no_college_user",
  homeCollegeId: null,
};
const sixOptionIds: readonly string[] = sixOptionQuestion.options.map((option) => option.id);
const sixOptionTexts = sixOptionQuestion.options.map((option) => option.text);

afterEach(stopTestServer);

function nextLobby(socket: TestSocket, matches: (lobby: LobbySnapshot) => boolean) {
  return new Promise<LobbySnapshot>((resolve) => {
    const listener = (lobby: LobbySnapshot) => {
      if (matches(lobby)) {
        socket.off("room:lobby", listener);
        resolve(lobby);
      }
    };
    socket.on("room:lobby", listener);
  });
}

function collectRounds(socket: TestSocket): RoundView[] {
  const received: RoundView[] = [];
  socket.on("round:state", (round) => received.push(round));
  return received;
}

function optionIds(round: RoundView): string[] {
  return round.question.options.map((option) => option.id);
}

function optionTexts(round: RoundView): string[] {
  return round.question.options.map((option) => option.text);
}

function collectLobbies(socket: TestSocket): LobbySnapshot[] {
  const received: LobbySnapshot[] = [];
  socket.on("room:lobby", (lobby) => received.push(lobby));
  return received;
}

function captureLogs(): { readonly logger: pino.Logger; readonly lines: string[] } {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { logger: pino({ level: "error" }, destination), lines };
}

/** Sends only the headers of a registration whose declared length exceeds the cap. */
function postOversizedHeaders(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({
      host: "127.0.0.1",
      port,
      path: ROOM_REGISTRATION_PATH,
      method: "POST",
      headers: { "content-type": "application/json", "content-length": OVERSIZED_BODY_BYTES },
    });
    outgoing.on("response", (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
      outgoing.destroy();
    });
    outgoing.on("error", reject);
    outgoing.write("{");
  });
}

async function hostLobby(port: number): Promise<TestSocket> {
  const host = await connectAs(port, hostUser);
  await expect(host.emitWithAck("room:host", { roomId: roomA.roomId })).resolves.toMatchObject({
    ok: true,
  });
  return host;
}

describe("room registration", () => {
  it("registers a Room signed with the shared secret", async () => {
    const { port } = await startServer();
    const response = await registerRoom(port, roomA);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, roomId: roomA.roomId });
  });

  it("refuses a registration signed with another secret", async () => {
    const { port } = await startServer();
    const response = await registerRoom(port, roomA, "another-secret-with-32-characters!!");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
  });

  it("refuses an expired registration", async () => {
    const { port } = await startServer();
    const longAgo = Date.now() - ROOM_REGISTRATION_LIFETIME_MS * 2;

    expect((await registerRoom(port, roomA, gameServerSecret, longAgo)).status).toBe(401);
  });

  it("refuses a Socket Ticket presented as a registration", async () => {
    const { port } = await startServer();
    const ticket = await issueSocketTicket(hostUser, gameServerSecret, Date.now());

    expect((await postRegistration(port, JSON.stringify({ registration: ticket }))).status).toBe(
      401,
    );
  });

  it.each([
    ["non-JSON", "not json"],
    ["a missing registration", JSON.stringify({})],
  ])("rejects %s bodies", async (_label, body) => {
    const { port } = await startServer();
    const response = await postRegistration(port, body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "invalid_registration" });
  });

  it("rejects an oversized body", async () => {
    const { port } = await startServer();
    const response = await postRegistration(port, "x".repeat(OVERSIZED_BODY_BYTES));

    expect(response.status).toBe(413);
  });

  it("rejects a declared oversized body before reading it", async () => {
    const { port } = await startServer();

    await expect(postOversizedHeaders(port)).resolves.toBe(413);
  });

  it("treats a repeated registration as the same Room without resetting its roster", async () => {
    const { port } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    await join(guest, "Asha");

    expect((await registerRoom(port, roomA)).status).toBe(200);
    const host = await connectAs(port, hostUser);
    const hosted = await host.emitWithAck("room:host", { roomId: roomA.roomId });

    expect(hosted).toMatchObject({ ok: true, lobby: { participants: [{ displayName: "Asha" }] } });
  });

  it("refuses a Join Code already used by another live Room", async () => {
    const { port } = await startWithRooms(roomA);
    const response = await registerRoom(port, { ...roomB, joinCode: roomA.joinCode });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "join_code_taken" });
  });
});

describe("room:host", () => {
  it("gives the Host the Lobby without Question content", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await connectAs(port, hostUser);
    const response = await host.emitWithAck("room:host", { roomId: roomA.roomId });

    expect(response).toEqual({
      ok: true,
      lobby: {
        roomId: roomA.roomId,
        joinCode: roomA.joinCode,
        phase: "LOBBY",
        college: roomA.college,
        questionSetTitle: roomA.questionSetTitle,
        questionCount: 1,
        participants: [],
        rules: {
          roundDurationMs: TEST_ROUND_DURATION_MS,
          maxDelayCompensationMs: 100,
          scoreBucketMs: 100,
        },
      },
      round: null,
    });
    expect(JSON.stringify(response)).not.toContain("correctOptionId");
  });

  it.each([
    ["a Guest", undefined],
    ["another User", otherUser],
  ])("refuses %s", async (_label, user) => {
    const { port } = await startWithRooms(roomA);
    const socket = await connectAs(port, user);

    await expect(socket.emitWithAck("room:host", { roomId: roomA.roomId })).resolves.toEqual({
      ok: false,
      error: "not_room_host",
    });
  });

  it("reports an unknown Room", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await connectAs(port, hostUser);

    await expect(host.emitWithAck("room:host", { roomId: "missing" })).resolves.toEqual({
      ok: false,
      error: "room_not_found",
    });
  });

  it("does not subscribe a refused socket to the Lobby", async () => {
    const { port } = await startWithRooms(roomA);
    const intruder = await connectAs(port, otherUser);
    await intruder.emitWithAck("room:host", { roomId: roomA.roomId });
    const received = collectLobbies(intruder);

    await join(await connectAs(port), "Asha");
    await settle();
    expect(received).toEqual([]);
  });
});

describe("room:join", () => {
  it("records a Guest with no User under the Room College", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    const key = randomUUID();
    const response = await join(guest, "  Asha  ", roomA.joinCode.toLowerCase(), key);

    expect(response).toMatchObject({
      ok: true,
      participant: { displayName: "Asha", isGuest: true },
      lobby: { participants: [{ displayName: "Asha", isGuest: true }] },
    });
    expect(store.participants).toEqual([
      {
        id: expect.any(String),
        roomId: roomA.roomId,
        collegeId: roomA.college.id,
        userId: null,
        displayName: "Asha",
        idempotencyKey: key,
        resumeTokenHash: expect.any(String),
      },
    ]);
  });

  it("records a signed-in User under their Home College", async () => {
    const { port, store } = await startWithRooms(roomA);
    await join(await connectAs(port, otherUser), "Ravi");

    expect(store.participants).toMatchObject([
      { userId: otherUser.userId, collegeId: otherUser.homeCollegeId },
    ]);
  });

  it("records a signed-in User without a Home College under the Room College", async () => {
    const { port, store } = await startWithRooms(roomA);
    await join(await connectAs(port, userWithoutCollege), "Meera");

    expect(store.participants).toMatchObject([
      { userId: userWithoutCollege.userId, collegeId: roomA.college.id },
    ]);
  });

  it("updates the Host and other Participants without a reload", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const first = await connectAs(port);
    await join(first, "Asha");
    const hostSees = nextLobby(host, (lobby) => lobby.participants.length === 2);
    const firstSees = nextLobby(first, (lobby) => lobby.participants.length === 2);

    await join(await connectAs(port, otherUser), "Ravi");

    for (const lobby of await Promise.all([hostSees, firstSees])) {
      expect(lobby.participants.map((participant) => participant.displayName)).toEqual([
        "Asha",
        "Ravi",
      ]);
    }
  });

  it.each([
    ["a malformed Join Code", "AB", "Asha", "invalid_join_code"],
    ["an unknown Join Code", "ZZZ999", "Asha", "room_not_found"],
    ["a too-short display name", roomA.joinCode, "A", "invalid_display_name"],
  ])("refuses %s without adding a Participant", async (_label, code, name, error) => {
    const { port, store } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const received = collectLobbies(host);

    await expect(join(await connectAs(port), name, code)).resolves.toEqual({ ok: false, error });
    await settle();
    expect(store.participants).toEqual([]);
    expect(received).toEqual([]);
  });

  it("refuses a payload without an idempotency key", async () => {
    const { port } = await startWithRooms(roomA);
    const guest = await connectAs(port);

    await expect(
      guest.emitWithAck("room:join", {
        joinCode: roomA.joinCode,
        displayName: "Asha",
        idempotencyKey: "not-a-uuid",
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_request" });
  });

  it("returns the original Participant for a retried key without a second write", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    const key = randomUUID();
    const first = await join(guest, "Asha", roomA.joinCode, key);
    const retry = await join(await connectAs(port), "Asha", roomA.joinCode, key);

    expect(retry).toEqual(first);
    expect(store.participants).toHaveLength(1);
  });

  it("shares one write between concurrent retries of the same key", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    const key = randomUUID();
    const release = store.holdParticipantWrites();
    const attempts = [
      join(guest, "Asha", roomA.joinCode, key),
      join(guest, "Asha", roomA.joinCode, key),
    ];
    await settle();
    release();

    const [first, second] = await Promise.all(attempts);
    expect(second).toEqual(first);
    expect(store.participants).toHaveLength(1);
  });

  it("keeps a signed-in User as one Participant when they rejoin with another key", async () => {
    const { port, store } = await startWithRooms(roomA);
    const first = await join(await connectAs(port, otherUser), "Ravi");
    const again = await join(await connectAs(port, otherUser), "Ravi Again");

    expect(again).toEqual(first);
    expect(store.participants).toHaveLength(1);
  });

  it("releases the slot and reports join_failed when the write fails", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    const key = randomUUID();
    store.failNextParticipant();

    await expect(join(guest, "Asha", roomA.joinCode, key)).resolves.toEqual({
      ok: false,
      error: "join_failed",
    });
    await expect(join(guest, "Asha", roomA.joinCode, key)).resolves.toMatchObject({ ok: true });
  });

  it("logs the Room when a participant write fails", async () => {
    const { logger, lines } = captureLogs();
    const { port, store } = await startServer({ logger });
    expect((await registerRoom(port, roomA)).status).toBe(200);
    store.failNextParticipant();

    await join(await connectAs(port), "Asha");

    expect(lines.join("")).toContain(`"roomId":"${roomA.roomId}"`);
  });

  it("refuses a join whose write finishes after the Host started", async () => {
    const { port, store } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const release = store.holdParticipantWrites();
    const attempt = join(await connectAs(port), "Asha");
    await settle();
    await host.emitWithAck("room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() });
    release();

    await expect(attempt).resolves.toEqual({ ok: false, error: "room_not_in_lobby" });
    const hosted = await host.emitWithAck("room:host", { roomId: roomA.roomId });
    expect(hosted.ok && hosted.lobby.participants).toEqual([]);
  });

  it("admits exactly 50 Participants and refuses the 51st without changing the roster", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);

    for (let index = 0; index < MAX_ROOM_PARTICIPANTS; index += 1) {
      await expect(join(guest, `Player ${index}`)).resolves.toMatchObject({ ok: true });
    }

    await expect(join(guest, "Latecomer")).resolves.toEqual({ ok: false, error: "room_full" });
    const host = await connectAs(port, hostUser);
    const hosted = await host.emitWithAck("room:host", { roomId: roomA.roomId });
    expect(hosted.ok && hosted.lobby.participants).toHaveLength(MAX_ROOM_PARTICIPANTS);
    expect(store.participants).toHaveLength(MAX_ROOM_PARTICIPANTS);
  });

  it("never exceeds 50 Participants under 51 concurrent joins", async () => {
    const { port, store } = await startWithRooms(roomA);
    const guest = await connectAs(port);
    const release = store.holdParticipantWrites();
    const attempts = Array.from({ length: MAX_ROOM_PARTICIPANTS + 1 }, (_, index) =>
      join(guest, `Player ${index}`),
    );
    await settle();
    release();

    const results = await Promise.all(attempts);
    expect(results.filter((result) => result.ok)).toHaveLength(MAX_ROOM_PARTICIPANTS);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, error: "room_full" }]);
    expect(store.participants).toHaveLength(MAX_ROOM_PARTICIPANTS);
  });

  it("keeps another Room's roster and broadcasts separate", async () => {
    const { port } = await startWithRooms(roomA, roomB);
    const roomBMember = await connectAs(port);
    await join(roomBMember, "Bina", roomB.joinCode);
    const roomBReceived = collectLobbies(roomBMember);

    const response = await join(await connectAs(port), "Asha");
    await settle();

    expect(response).toMatchObject({
      ok: true,
      lobby: { participants: [{ displayName: "Asha" }] },
    });
    expect(roomBReceived).toEqual([]);
  });
});

describe("room:start", () => {
  it("shows a shared Getting ready countdown before opening Question 1", async () => {
    const { port, clock, deadlines } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const guest = await connectAs(port);
    const joined = await join(guest, "Asha");
    expect(joined.ok).toBe(true);
    const guestReady = nextLobby(guest, (lobby) => lobby.phase === "GETTING_READY");
    const firstRound = nextRound(guest);

    const started = await host.emitWithAck("room:start", {
      roomId: roomA.roomId,
      idempotencyKey: randomUUID(),
    });

    expect(started).toMatchObject({
      ok: true,
      lobby: {
        phase: "GETTING_READY",
        ready: { endsAt: ROUND_OPENED_AT },
      },
    });
    await expect(guestReady).resolves.toMatchObject({
      phase: "GETTING_READY",
      ready: { endsAt: ROUND_OPENED_AT },
    });
    if (joined.ok) {
      await expect(
        guest.emitWithAck("round:answer", {
          roomId: roomA.roomId,
          questionIndex: 0,
          optionId: "anything",
          idempotencyKey: randomUUID(),
        }),
      ).resolves.toEqual({ ok: false, error: "round_not_open" });
      const returned = await connectAs(port);
      await expect(
        returned.emitWithAck("room:resume", {
          joinCode: roomA.joinCode,
          resumeToken: joined.resumeToken,
        }),
      ).resolves.toMatchObject({
        ok: true,
        lobby: { phase: "GETTING_READY", ready: { endsAt: ROUND_OPENED_AT } },
        round: null,
      });
    }

    expect(clock.now()).toBe(ROOM_STARTED_AT);
    clock.advance(TEST_READY_DURATION_MS);
    deadlines.fireDue();
    await expect(firstRound).resolves.toMatchObject({
      phase: "QUESTION_OPEN",
      startsAt: ROUND_OPENED_AT,
      endsAt: ROUND_OPENED_AT + TEST_ROUND_DURATION_MS,
    });
  });

  it.each([
    ["a Guest", undefined],
    ["another User", otherUser],
  ])("refuses a start from %s", async (_label, user) => {
    const { port, store } = await startWithRooms(roomA);
    const socket = await connectAs(port, user);

    await expect(
      socket.emitWithAck("room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() }),
    ).resolves.toEqual({ ok: false, error: "not_room_host" });
    await expect(join(socket, "Still Open")).resolves.toMatchObject({ ok: true });
    expect(store.startedRoomIds).toEqual([]);
  });

  it("leaves the Lobby once and tells every member", async () => {
    const { port, store, clock, deadlines } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const guest = await connectAs(port);
    await join(guest, "Asha");
    const guestSees = nextLobby(guest, (lobby) => lobby.phase !== "LOBBY");
    const hostSees = nextLobby(host, (lobby) => lobby.phase !== "LOBBY");

    const response = await host.emitWithAck("room:start", {
      roomId: roomA.roomId,
      idempotencyKey: randomUUID(),
    });

    expect(response).toMatchObject({ ok: true, lobby: { phase: "GETTING_READY" } });
    await expect(guestSees).resolves.toMatchObject({ phase: "GETTING_READY" });
    await expect(hostSees).resolves.toMatchObject({ phase: "GETTING_READY" });
    expect(JSON.stringify(await guestSees)).not.toContain("correctOptionId");
    expect(store.startedRoomIds).toEqual([roomA.roomId]);
    const guestOpens = nextLobby(guest, (lobby) => lobby.phase === "QUESTION_OPEN");
    clock.advance(TEST_READY_DURATION_MS);
    deadlines.fireDue();
    await expect(guestOpens).resolves.toMatchObject({ phase: "QUESTION_OPEN" });
  });

  it("returns the original result for a retried key without a second transition", async () => {
    const { port, store } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    const key = randomUUID();
    const first = await host.emitWithAck("room:start", {
      roomId: roomA.roomId,
      idempotencyKey: key,
    });
    const received = collectLobbies(host);
    const retry = await host.emitWithAck("room:start", {
      roomId: roomA.roomId,
      idempotencyKey: key,
    });
    await settle();

    expect(retry).toEqual(first);
    expect(received).toEqual([]);
    expect(store.startedRoomIds).toEqual([roomA.roomId]);
  });

  it("refuses a second start with a different key", async () => {
    const { port } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    await host.emitWithAck("room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() });

    await expect(
      host.emitWithAck("room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() }),
    ).resolves.toEqual({ ok: false, error: "room_not_in_lobby" });
  });

  it("refuses new joins after start without changing the roster", async () => {
    const { port, store } = await startWithRooms(roomA);
    const host = await hostLobby(port);
    await host.emitWithAck("room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() });

    await expect(join(await connectAs(port), "Latecomer")).resolves.toEqual({
      ok: false,
      error: "room_not_in_lobby",
    });
    expect(store.participants).toEqual([]);
  });
});

describe("round:state", () => {
  it("opens one server-timed Round with the same Question and deadline for each Participant", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const asha = await connectAs(port);
    const ravi = await connectAs(port, otherUser);
    await join(asha, "Asha", roundRoom.joinCode);
    await join(ravi, "Ravi", roundRoom.joinCode);
    const rounds = Promise.all([nextRound(asha), nextRound(ravi)]);

    await startRoom(host, roundRoom.roomId);

    for (const round of await rounds) {
      expect(round).toMatchObject({
        phase: "QUESTION_OPEN",
        roomId: roundRoom.roomId,
        questionIndex: 0,
        questionCount: 2,
        startsAt: ROUND_OPENED_AT,
        endsAt: ROUND_OPENED_AT + TEST_ROUND_DURATION_MS,
        serverTime: ROUND_OPENED_AT,
        question: {
          text: sixOptionQuestion.text,
          topic: sixOptionQuestion.topic,
          difficulty: sixOptionQuestion.difficulty,
          media: sixOptionQuestion.media,
        },
      });
      expect([...optionTexts(round)].sort()).toEqual([...sixOptionTexts].sort());
    }
  });

  it("gives each Participant opaque option ids of their own", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const asha = await connectAs(port);
    const ravi = await connectAs(port);
    await join(asha, "Asha", roundRoom.joinCode);
    await join(ravi, "Ravi", roundRoom.joinCode);
    const rounds = Promise.all([nextRound(asha), nextRound(ravi)]);

    await startRoom(host, roundRoom.roomId);

    const [ashaIds, raviIds] = (await rounds).map(optionIds);
    const allIds = [...(ashaIds ?? []), ...(raviIds ?? [])];
    expect(new Set(allIds).size).toBe(sixOptionIds.length * 2);
    expect(allIds.filter((id) => sixOptionIds.includes(id))).toEqual([]);
  });

  it("assigns option orders per Participant", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const participants = await Promise.all(Array.from({ length: 6 }, () => connectAs(port)));
    for (const [index, participant] of participants.entries()) {
      await join(participant, `Player ${index}`, roundRoom.joinCode);
    }
    const rounds = Promise.all(participants.map(nextRound));

    await startRoom(host, roundRoom.roomId);

    const orders = new Set((await rounds).map((round) => optionTexts(round).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("keeps a Participant's option order and deadline when they rejoin", async () => {
    const { port, clock } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const guest = await connectAs(port);
    const user = await connectAs(port, otherUser);
    const guestKey = randomUUID();
    await join(guest, "Asha", roundRoom.joinCode, guestKey);
    await join(user, "Ravi", roundRoom.joinCode);
    const firstRounds = Promise.all([nextRound(guest), nextRound(user)]);
    await startRoom(host, roundRoom.roomId);
    const [guestRound, userRound] = await firstRounds;
    clock.advance(CLOCK_ADVANCE_MS);

    const guestRejoin = await join(await connectAs(port), "Asha", roundRoom.joinCode, guestKey);
    const userRejoin = await join(await connectAs(port, otherUser), "Ravi", roundRoom.joinCode);

    expect(guestRejoin).toMatchObject({
      ok: true,
      round: { ...guestRound, serverTime: ROUND_OPENED_AT + CLOCK_ADVANCE_MS },
    });
    expect(userRejoin).toMatchObject({
      ok: true,
      round: { ...userRound, serverTime: ROUND_OPENED_AT + CLOCK_ADVANCE_MS },
    });
  });

  it("delivers to every socket of a rejoined Participant", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const key = randomUUID();
    const first = await connectAs(port);
    const second = await connectAs(port);
    await join(first, "Asha", roundRoom.joinCode, key);
    await join(second, "Asha", roundRoom.joinCode, key);
    const rounds = Promise.all([nextRound(first), nextRound(second)]);

    await startRoom(host, roundRoom.roomId);

    const [firstRound, secondRound] = await rounds;
    expect(secondRound).toEqual(firstRound);
  });

  it("gives the Host the canonical option order", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const hostRound = nextRound(host);

    await startRoom(host, roundRoom.roomId);

    expect(optionIds(await hostRound)).toEqual(sixOptionIds);
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    expect(hosted.ok && hosted.round).toMatchObject({
      endsAt: ROUND_OPENED_AT + TEST_ROUND_DURATION_MS,
      question: { text: sixOptionQuestion.text },
    });
  });

  it("subscribes a Host who only starts the Room to the Round", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await connectAs(port, hostUser);
    const hostRound = nextRound(host);

    await startRoom(host, roundRoom.roomId);

    await expect(hostRound).resolves.toMatchObject({ questionIndex: 0 });
  });

  it("sends no Round to Participants of another Room", async () => {
    const { port } = await startWithRooms(roundRoom, roomB);
    const host = await hostRoom(port, roundRoom.roomId);
    const outsider = await connectAs(port);
    await join(outsider, "Bina", roomB.joinCode);
    const received = collectRounds(outsider);

    await startRoom(host, roundRoom.roomId);
    await settle();

    expect(received).toEqual([]);
  });

  it("answers a Lobby join and Lobby host with no Round", async () => {
    const { port } = await startWithRooms(roundRoom);
    const hosted = await (await connectAs(port, hostUser)).emitWithAck("room:host", {
      roomId: roundRoom.roomId,
    });

    expect(hosted).toMatchObject({ ok: true, round: null });
    await expect(join(await connectAs(port), "Asha", roundRoom.joinCode)).resolves.toMatchObject({
      ok: true,
      round: null,
    });
  });

  it("sends no correct option or explanation before the reveal", async () => {
    const { port } = await startWithRooms(roundRoom);
    const host = await connectAs(port, hostUser);
    const guest = await connectAs(port);
    const user = await connectAs(port, otherUser);
    const received: unknown[] = [];
    recordEveryEvent([host, guest, user], received);
    const guestKey = randomUUID();

    received.push(await host.emitWithAck("room:host", { roomId: roundRoom.roomId }));
    received.push(await join(guest, "Asha", roundRoom.joinCode, guestKey));
    received.push(await join(user, "Ravi", roundRoom.joinCode));
    const guestRound = nextRound(guest);
    received.push(await startRoom(host, roundRoom.roomId));
    await guestRound;
    received.push(await host.emitWithAck("room:host", { roomId: roundRoom.roomId }));
    received.push(await join(await connectAs(port), "Asha", roundRoom.joinCode, guestKey));
    received.push(await join(await connectAs(port, otherUser), "Ravi", roundRoom.joinCode));
    await settle();

    expect(received.length).toBeGreaterThan(0);
    expect(findFieldPaths(received, PRE_REVEAL_FIELDS)).toEqual([]);
  });

  it("never opens another Round or moves the deadline on a repeated start", async () => {
    const { port, clock } = await startWithRooms(roundRoom);
    const host = await hostRoom(port, roundRoom.roomId);
    const guest = await connectAs(port);
    await join(guest, "Asha", roundRoom.joinCode);
    const received = collectRounds(guest);
    const key = randomUUID();
    await startRoom(host, roundRoom.roomId, key);
    await settle();
    clock.advance(CLOCK_ADVANCE_MS);

    await startRoom(host, roundRoom.roomId, key);
    await startRoom(host, roundRoom.roomId);
    await settle();

    expect(received).toHaveLength(1);
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    expect(hosted.ok && hosted.round).toMatchObject({
      startsAt: ROUND_OPENED_AT,
      endsAt: ROUND_OPENED_AT + TEST_ROUND_DURATION_MS,
      serverTime: ROUND_OPENED_AT + CLOCK_ADVANCE_MS,
    });
  });
});

describe("events without an acknowledgement", () => {
  it.each([
    ["room:host", { roomId: roomA.roomId }],
    ["room:host", { bad: true }],
    ["room:join", { joinCode: roomA.joinCode, displayName: "Asha", idempotencyKey: randomUUID() }],
    ["room:join", { bad: true }],
    ["room:start", { roomId: roomA.roomId, idempotencyKey: randomUUID() }],
    ["room:start", { bad: true }],
    ["room:advance", { roomId: roomA.roomId, idempotencyKey: randomUUID() }],
    ["room:advance", { bad: true }],
    ["time:ping", { clientSentAt: 1 }],
    ["time:ping", { bad: true }],
    [
      "round:answer",
      { roomId: roomA.roomId, questionIndex: 0, optionId: "b", idempotencyKey: randomUUID() },
    ],
    ["round:answer", { bad: true }],
  ])("keeps serving after %s without a callback", async (event, payload) => {
    const { port } = await startWithRooms(roomA);
    const host = await connectAs(port, hostUser);

    emitWithoutAck(host, event, payload);
    await settle();

    await expect(host.emitWithAck("room:host", { roomId: roomA.roomId })).resolves.toMatchObject({
      ok: true,
    });
  });
});
