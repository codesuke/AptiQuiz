import { randomUUID } from "node:crypto";
import type { LobbySnapshot } from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
  connectAs,
  hostRoom,
  join,
  nextRound,
  roundRoom,
  settle,
  startRoom,
  startWithRooms,
  stopTestServer,
  TEST_READY_DURATION_MS,
  type TestSocket,
} from "./testing/room-harness.js";
import { advanceTo, optionIdFor, submit } from "./testing/round-harness.js";

const REVEAL_DURATION_MS = 6_000;

afterEach(stopTestServer);

function nextLobby(socket: TestSocket, phase: LobbySnapshot["phase"]): Promise<LobbySnapshot> {
  return new Promise((resolve) => {
    const onLobby = (lobby: LobbySnapshot) => {
      if (lobby.phase !== phase) return;
      socket.off("room:lobby", onLobby);
      resolve(lobby);
    };
    socket.on("room:lobby", onLobby);
  });
}

describe("automatic Match progression", () => {
  it("refuses every manual advance, including from the Host after a reveal", async () => {
    const server = await startWithRooms(roundRoom);
    const host = await hostRoom(server.port, roundRoom.roomId);
    const guest = await connectAs(server.port);
    await join(guest, "Asha", roundRoom.joinCode);
    const request = { roomId: roundRoom.roomId, idempotencyKey: randomUUID() };

    await expect(host.emitWithAck("room:advance", request)).resolves.toEqual({
      ok: false,
      error: "advance_disabled",
    });
    const opened = nextRound(guest);
    await startRoom(host, roundRoom.roomId);
    const first = await opened;
    const revealed = nextRound(guest);
    advanceTo(server.clock, first.endsAt + 1);
    server.deadlines.fireDue();
    await revealed;

    for (const socket of [host, guest]) {
      await expect(socket.emitWithAck("room:advance", request)).resolves.toEqual({
        ok: false,
        error: "advance_disabled",
      });
    }
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    expect(hosted).toMatchObject({ ok: true, lobby: { phase: "QUESTION_REVEAL" } });
  });

  it("closes early once and restores reveal and ready deadlines on reconnect", async () => {
    const server = await startWithRooms(roundRoom);
    const host = await hostRoom(server.port, roundRoom.roomId);
    const asha = await connectAs(server.port);
    const ravi = await connectAs(server.port);
    const joinedAsha = await join(asha, "Asha", roundRoom.joinCode);
    await join(ravi, "Ravi", roundRoom.joinCode);
    if (!joinedAsha.ok) throw new Error("Asha did not join");
    const opened = Promise.all([nextRound(asha), nextRound(ravi)]);
    await startRoom(host, roundRoom.roomId);
    const [ashaFirst, raviFirst] = await opened;
    if (!ashaFirst || !raviFirst) throw new Error("Question 1 did not open");
    const reveals = Promise.all([nextRound(asha), nextRound(ravi)]);
    await submit(asha, ashaFirst, optionIdFor(ashaFirst, "7"));
    await submit(ravi, raviFirst, optionIdFor(raviFirst, "4"));
    const [revealed] = await reveals;
    if (revealed?.phase !== "QUESTION_REVEAL") {
      throw new Error("Question 1 did not reveal");
    }
    expect(revealed.revealEndsAt).toBe(server.clock.now() + REVEAL_DURATION_MS);
    const returned = await connectAs(server.port);
    await expect(
      returned.emitWithAck("room:resume", {
        joinCode: roundRoom.joinCode,
        resumeToken: joinedAsha.resumeToken,
      }),
    ).resolves.toMatchObject({
      ok: true,
      round: { phase: "QUESTION_REVEAL", revealEndsAt: revealed.revealEndsAt },
    });

    const ready = nextLobby(asha, "GETTING_READY");
    advanceTo(server.clock, revealed.revealEndsAt);
    server.deadlines.fireDue();
    server.deadlines.fireDue();
    const readyLobby = await ready;
    expect(readyLobby.ready).toMatchObject({
      questionIndex: 1,
      endsAt: revealed.revealEndsAt + TEST_READY_DURATION_MS,
    });
    await expect(
      returned.emitWithAck("room:resume", {
        joinCode: roundRoom.joinCode,
        resumeToken: joinedAsha.resumeToken,
      }),
    ).resolves.toMatchObject({
      ok: true,
      lobby: { phase: "GETTING_READY", ready: readyLobby.ready },
      round: null,
    });

    const second = nextRound(asha);
    advanceTo(server.clock, readyLobby.ready?.endsAt ?? 0);
    server.deadlines.fireDue();
    await expect(second).resolves.toMatchObject({ phase: "QUESTION_OPEN", questionIndex: 1 });
    server.deadlines.fireDue();
    await settle();
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    expect(hosted).toMatchObject({ ok: true, round: { phase: "QUESTION_OPEN", questionIndex: 1 } });
  });

  it("ignores a stale reveal callback after the next Question reveals", async () => {
    const server = await startWithRooms(roundRoom);
    const host = await hostRoom(server.port, roundRoom.roomId);
    const guest = await connectAs(server.port);
    await join(guest, "Asha", roundRoom.joinCode);
    const firstOpened = nextRound(guest);
    await startRoom(host, roundRoom.roomId);
    const first = await firstOpened;
    const firstReveal = nextRound(guest);
    advanceTo(server.clock, first.endsAt + 1);
    server.deadlines.fireDue();
    const revealedFirst = await firstReveal;
    if (revealedFirst.phase !== "QUESTION_REVEAL") throw new Error("first Question did not reveal");
    const oldCallback = server.deadlines
      .callbacks()
      .find((timer) => timer.at === revealedFirst.revealEndsAt)?.callback;
    if (!oldCallback) throw new Error("first reveal timer missing");

    const secondOpened = nextRound(guest);
    advanceTo(server.clock, revealedFirst.revealEndsAt);
    server.deadlines.fireDue();
    await settle();
    server.clock.advance(TEST_READY_DURATION_MS);
    server.deadlines.fireDue();
    const second = await secondOpened;
    const secondReveal = nextRound(guest);
    advanceTo(server.clock, second.endsAt + 1);
    server.deadlines.fireDue();
    const revealedSecond = await secondReveal;
    if (revealedSecond.phase !== "QUESTION_REVEAL")
      throw new Error("second Question did not reveal");

    oldCallback();
    await settle();
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });
    expect(hosted).toMatchObject({
      ok: true,
      lobby: { phase: "QUESTION_REVEAL" },
      round: { questionIndex: 1 },
    });
    expect(
      server.deadlines.callbacks().some((timer) => timer.at === revealedSecond.revealEndsAt),
    ).toBe(true);
  });
});
