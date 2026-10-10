import { randomUUID } from "node:crypto";
import type { LatencyPing } from "@aptiquiz/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { GameServerConfig } from "./config.js";
import {
  connectAs,
  findFieldPaths,
  hostRoom,
  hostUser,
  join,
  nextRound,
  otherUser,
  ROUND_OPENED_AT,
  recordEveryEvent,
  roundRoom,
  settle,
  sixOptionQuestion,
  startRoom,
  startServerWithRooms,
  stopTestServer,
  TEST_READY_DURATION_MS,
  type TestServer,
  type TestSocket,
} from "./testing/room-harness.js";
import {
  advanceTo,
  CORRECT_OPTION_TEXT,
  joinPlayer,
  openRound,
  optionIdFor,
  type PlayerOptions,
  submit,
  WRONG_OPTION_TEXT,
} from "./testing/round-harness.js";

const LARGE_ROUND_TRIP_MS = 1_000;
const SMALL_ROUND_TRIP_MS = 60;
const FAST_SAMPLE_INTERVAL_MS = 20;
const PRE_REVEAL_FIELDS = [
  "correct",
  "correctOptionId",
  "points",
  "effectiveResponseMs",
  "authoredOptionId",
  "explanation",
] as const;

afterEach(stopTestServer);

function startAnswerServer(config: Partial<GameServerConfig> = {}): Promise<TestServer> {
  return startServerWithRooms({ config }, roundRoom);
}

async function openRoundFor(testServer: TestServer, options: PlayerOptions = {}) {
  const player = await joinPlayer(testServer, "Asha", options);
  const { host, rounds } = await openRound(testServer, [player]);
  const [round] = rounds;

  if (round === undefined) {
    throw new Error("the Round did not open");
  }

  return { player, host, round };
}

function recordedAnswers({ registry }: TestServer) {
  return registry.answersFor(roundRoom.roomId, 0);
}

describe("round:answer", () => {
  it("locks an on-time Answer without saying whether it is correct", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);
    const optionId = optionIdFor(round, CORRECT_OPTION_TEXT);
    testServer.clock.advance(1_250);

    await expect(submit(player.socket, round, optionId)).resolves.toEqual({
      ok: true,
      answer: { questionIndex: 0, optionId, receivedAt: round.startsAt + 1_250 },
    });
  });

  it("accepts an Answer received exactly at the deadline", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);
    advanceTo(testServer.clock, round.endsAt);

    await expect(
      submit(player.socket, round, optionIdFor(round, WRONG_OPTION_TEXT)),
    ).resolves.toMatchObject({ ok: true, answer: { receivedAt: round.endsAt } });
  });

  it.each([1, 150])(
    "rejects an Answer received %i ms after the deadline despite a large round trip",
    async (lateByMs) => {
      const testServer = await startAnswerServer();
      const { player, round } = await openRoundFor(testServer, {
        roundTripMs: LARGE_ROUND_TRIP_MS,
      });
      advanceTo(testServer.clock, round.endsAt + lateByMs);

      await expect(
        submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT)),
      ).resolves.toEqual({ ok: false, error: "answer_too_late" });
      expect(recordedAnswers(testServer)).toEqual([]);
    },
  );

  it("refuses a second Answer with a new key without replacing the first", async () => {
    const testServer = await startAnswerServer();
    // A Participant who never answers keeps the Round open after the first Answer.
    await joinPlayer(testServer, "Meera");
    const { player, round } = await openRoundFor(testServer);
    const first = await submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT));
    const recorded = recordedAnswers(testServer);

    await expect(
      submit(player.socket, round, optionIdFor(round, WRONG_OPTION_TEXT)),
    ).resolves.toEqual({ ok: false, error: "already_answered" });
    expect(first.ok).toBe(true);
    expect(recordedAnswers(testServer)).toEqual(recorded);
    expect(recorded).toHaveLength(1);
  });

  it("returns the original result for a retried key, even after the deadline", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);
    const key = randomUUID();
    const first = await submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT), key);
    advanceTo(testServer.clock, round.endsAt + 1);

    const retry = await submit(player.socket, round, optionIdFor(round, WRONG_OPTION_TEXT), key);

    expect(retry).toEqual(first);
    expect(recordedAnswers(testServer)).toHaveLength(1);
  });

  it.each([
    ["an empty payload", {}],
    ["a key that is not a UUID", { questionIndex: 0, optionId: "x", idempotencyKey: "key" }],
    ["a negative Question index", { questionIndex: -1, optionId: "x", idempotencyKey: "" }],
    ["a missing option", { questionIndex: 0, idempotencyKey: randomUUID() }],
  ])("refuses %s", async (_label, fields) => {
    const testServer = await startAnswerServer();
    const { player } = await openRoundFor(testServer);

    await expect(
      player.socket.emitWithAck("round:answer", {
        roomId: roundRoom.roomId,
        ...fields,
      } as never),
    ).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(recordedAnswers(testServer)).toEqual([]);
  });

  it("reports an unknown Room", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);

    await expect(
      submit(
        player.socket,
        { ...round, roomId: "missing" },
        optionIdFor(round, CORRECT_OPTION_TEXT),
      ),
    ).resolves.toEqual({ ok: false, error: "room_not_found" });
  });

  it("refuses a Guest who did not join the Room", async () => {
    const testServer = await startAnswerServer();
    const { round } = await openRoundFor(testServer);
    const outsider = await connectAs(testServer.port);

    await expect(submit(outsider, round, optionIdFor(round, CORRECT_OPTION_TEXT))).resolves.toEqual(
      { ok: false, error: "not_participant" },
    );
    expect(recordedAnswers(testServer)).toEqual([]);
  });

  it("refuses the Host, even with the authored correct option", async () => {
    const testServer = await startAnswerServer();
    const { host, round } = await openRoundFor(testServer);

    await expect(submit(host, round, sixOptionQuestion.correctOptionId)).resolves.toEqual({
      ok: false,
      error: "not_participant",
    });
    expect(recordedAnswers(testServer)).toEqual([]);
  });

  it("refuses an Answer before the Round opens", async () => {
    const testServer = await startAnswerServer();
    const { socket } = await joinPlayer(testServer, "Asha");

    await expect(
      socket.emitWithAck("round:answer", {
        roomId: roundRoom.roomId,
        questionIndex: 0,
        optionId: "opt_3",
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toEqual({ ok: false, error: "round_not_open" });
  });

  it("refuses an Answer for another Question", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);

    await expect(
      submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT), randomUUID(), 1),
    ).resolves.toEqual({ ok: false, error: "wrong_round" });
    expect(recordedAnswers(testServer)).toEqual([]);
  });

  it("refuses the authored option id and another Participant's option id", async () => {
    const testServer = await startAnswerServer();
    const asha = await joinPlayer(testServer, "Asha");
    const ravi = await joinPlayer(testServer, "Ravi", { user: otherUser });
    const { rounds } = await openRound(testServer, [asha, ravi]);
    const [ashaRound, raviRound] = rounds;

    if (ashaRound === undefined || raviRound === undefined) {
      throw new Error("the Round did not open");
    }

    for (const optionId of ["opt_3", optionIdFor(raviRound, CORRECT_OPTION_TEXT)]) {
      await expect(submit(asha.socket, ashaRound, optionId)).resolves.toEqual({
        ok: false,
        error: "invalid_option",
      });
    }
    expect(recordedAnswers(testServer)).toEqual([]);
  });

  it("accepts an Answer from a rejoined socket and shows it on the next rejoin", async () => {
    const testServer = await startAnswerServer();
    const key = randomUUID();
    const { host, round } = await openRoundFor(testServer, { key });
    const rejoined = await rejoin(testServer, key);
    const locked = await submit(rejoined, round, optionIdFor(round, CORRECT_OPTION_TEXT));
    const again = await join(await connectAs(testServer.port), "Asha", roundRoom.joinCode, key);
    const hosted = await host.emitWithAck("room:host", { roomId: roundRoom.roomId });

    expect(locked.ok).toBe(true);
    expect(again).toMatchObject({ ok: true, round: { answer: locked.ok ? locked.answer : null } });
    expect(hosted).toMatchObject({ ok: true, round: { answer: null } });
  });

  it("never discloses correctness, points, or the correct option before the reveal", async () => {
    const testServer = await startAnswerServer();
    const key = randomUUID();
    const asha = await joinPlayer(testServer, "Asha", { key });
    const ravi = await joinPlayer(testServer, "Ravi", { user: otherUser });
    // A Participant who never answers keeps the Round open, so nothing here is a reveal.
    await joinPlayer(testServer, "Meera");
    const host = await connectAs(testServer.port, hostUser);
    const received: unknown[] = [];
    recordEveryEvent([asha.socket, ravi.socket, host], received);
    const opening = Promise.all([nextRound(asha.socket), nextRound(ravi.socket)]);
    received.push(await startRoom(host, roundRoom.roomId));
    const [ashaRound, raviRound] = await opening;

    if (ashaRound === undefined || raviRound === undefined) {
      throw new Error("the Round did not open");
    }

    received.push(
      await submit(asha.socket, ashaRound, optionIdFor(ashaRound, CORRECT_OPTION_TEXT)),
    );
    received.push(await submit(ravi.socket, raviRound, optionIdFor(raviRound, WRONG_OPTION_TEXT)));
    received.push(await submit(asha.socket, ashaRound, optionIdFor(ashaRound, WRONG_OPTION_TEXT)));
    received.push(await join(await connectAs(testServer.port), "Asha", roundRoom.joinCode, key));
    received.push(await host.emitWithAck("room:host", { roomId: roundRoom.roomId }));
    await settle();

    expect(findFieldPaths(received, PRE_REVEAL_FIELDS)).toEqual([]);
  });
});

/** Connects a new socket as the Guest who joined with `key`. */
async function rejoin(testServer: TestServer, key: string): Promise<TestSocket> {
  const socket = await connectAs(testServer.port);
  await expect(join(socket, "Asha", roundRoom.joinCode, key)).resolves.toMatchObject({ ok: true });
  return socket;
}

describe("Answer scoring", () => {
  it("applies no delay compensation without an acknowledged ping, in 100 ms buckets", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);
    const optionId = optionIdFor(round, CORRECT_OPTION_TEXT);
    testServer.clock.advance(1_299);

    await submit(player.socket, round, optionId);

    expect(recordedAnswers(testServer)).toEqual([
      expect.objectContaining({
        authoredOptionId: "opt_3",
        optionId,
        receivedAt: round.startsAt + 1_299,
        effectiveResponseMs: 1_200,
        correct: true,
        points: 880,
      }),
    ]);
  });

  it("subtracts half the median round trip", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer, {
      roundTripMs: SMALL_ROUND_TRIP_MS,
    });
    testServer.clock.advance(1_220);

    await submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT));

    expect(recordedAnswers(testServer)).toEqual([
      expect.objectContaining({ effectiveResponseMs: 1_100, points: 890 }),
    ]);
  });

  it("subtracts at most 100 ms for a large round trip", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer, {
      roundTripMs: LARGE_ROUND_TRIP_MS,
    });
    testServer.clock.advance(1_350);

    await submit(player.socket, round, optionIdFor(round, CORRECT_OPTION_TEXT));

    expect(recordedAnswers(testServer)).toEqual([
      expect.objectContaining({ effectiveResponseMs: 1_200, points: 880 }),
    ]);
  });

  it("scores a wrong Answer zero", async () => {
    const testServer = await startAnswerServer();
    const { player, round } = await openRoundFor(testServer);

    await submit(player.socket, round, optionIdFor(round, WRONG_OPTION_TEXT));

    expect(recordedAnswers(testServer)).toEqual([
      expect.objectContaining({ authoredOptionId: "opt_1", correct: false, points: 0 }),
    ]);
  });
});

describe("latency:ping", () => {
  function collectPings(socket: TestSocket): LatencyPing[] {
    const received: LatencyPing[] = [];
    socket.on("latency:ping", (payload, acknowledge) => {
      received.push(payload);
      acknowledge();
    });
    return received;
  }

  it("pings a Participant as soon as they join, stamped with server time", async () => {
    const testServer = await startAnswerServer();
    const socket = await connectAs(testServer.port);
    const pings = collectPings(socket);

    await join(socket, "Asha", roundRoom.joinCode);
    await settle();

    expect(pings).toEqual([{ serverSentAt: ROUND_OPENED_AT - TEST_READY_DURATION_MS }]);
  });

  it("keeps one sampler when a socket joins again", async () => {
    const testServer = await startAnswerServer();
    const socket = await connectAs(testServer.port);
    const pings = collectPings(socket);
    const key = randomUUID();

    await join(socket, "Asha", roundRoom.joinCode, key);
    await join(socket, "Asha", roundRoom.joinCode, key);
    await settle();

    expect(pings).toHaveLength(1);
  });

  it("does not ping the Host or a socket that has not joined", async () => {
    const testServer = await startAnswerServer();
    const host = await hostRoom(testServer.port, roundRoom.roomId);
    const outsider = await connectAs(testServer.port);
    const pings = [host, outsider].map(collectPings);

    await settle();

    expect(pings.flat()).toEqual([]);
  });

  it("keeps sampling and scores from the most recent window only", async () => {
    const testServer = await startAnswerServer({
      latencySampling: { intervalMs: FAST_SAMPLE_INTERVAL_MS, windowSize: 5, timeoutMs: 100 },
    });
    const socket = await connectAs(testServer.port);
    const enoughSamples = new Promise<void>((resolve) => {
      let acknowledged = 0;
      socket.on("latency:ping", (_payload, acknowledge) => {
        acknowledged += 1;
        // The first window is slow; the five samples after it are instant.
        if (acknowledged <= 5) {
          testServer.clock.advance(LARGE_ROUND_TRIP_MS);
        }
        acknowledge();
        if (acknowledged === 10) {
          resolve();
        }
      });
    });
    await join(socket, "Asha", roundRoom.joinCode);
    await enoughSamples;
    const { rounds } = await openRound(testServer, [{ socket }]);
    const [round] = rounds;

    if (round === undefined) {
      throw new Error("the Round did not open");
    }

    testServer.clock.advance(1_250);
    await submit(socket, round, optionIdFor(round, CORRECT_OPTION_TEXT));

    expect(recordedAnswers(testServer)).toEqual([
      expect.objectContaining({ effectiveResponseMs: 1_200 }),
    ]);
  });
});
