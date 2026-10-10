import { randomUUID } from "node:crypto";
import {
  type LobbySnapshot,
  type LockedAnswer,
  type RevealedRound,
  type RoundView,
  roomAdvanceResponseSchema,
  roomResumeResponseSchema,
  roomStartResponseSchema,
  roundAnswerResponseSchema,
} from "@aptiquiz/contracts";
import {
  type Cohort,
  expectedCounts,
  LATE_ROUND_INDEX,
  planFor,
  RESUME_ROUND_INDEX,
  resumesMidRound,
} from "./cohorts.js";
import type { LoggedRound } from "./event-log.js";
import { correctOptionId, fixtureMismatch, STARTER_FIXTURE, wrongOptionId } from "./fixture.js";
import { Invariants } from "./invariants.js";
import { refused, SimulationError, STEP_TIMEOUT_MS, timed } from "./rpc.js";
import type { RoomSession, SimulatedParticipant } from "./session.js";
import { checkFinalResults, checkLeaderboard, type ExpectedFinal } from "./standings.js";

/** Margin after the estimated deadline, so a deliberately late Answer is never early. */
const LATE_ANSWER_MARGIN_MS = 50;
const REVEAL_WAIT_MARGIN_MS = 15_000;
const MIN_POINTS = 500;
const MAX_POINTS = 1000;

type OpenRound = Extract<RoundView, { phase: "QUESTION_OPEN" }>;

export interface MatchStageResult {
  questionsCompleted: number;
  acceptedAnswers: number;
  wrongAnswers: number;
  unansweredParticipantRounds: number;
  duplicateRejections: number;
  exactKeyReplays: number;
  lateRejections: Record<string, number>;
  revealChecks: number;
  resumes: { attempted: number; succeeded: number };
  /** Rounds whose ordered Leaderboard was identical for the Host and every Participant. */
  leaderboardsConverged: number;
  finalResultsVerified: number;
  secrecy: { payloadsScanned: number; leaks: number };
  timing: { roundDurationMs: number; maxDelayCompensationMs: number; scoreBucketMs: number };
  /** Revealed points of every Participant for each closed Round, in Question order. */
  roundPoints: Map<string, number[]>;
}

interface Tally {
  accepted: number;
  wrong: number;
  unanswered: number;
  duplicateRejections: number;
  exactKeyReplays: number;
  lateRejections: Record<string, number>;
}

interface ExpectedOutcome {
  answered: boolean;
  correct: boolean;
}

const LATE_ANSWER_ERRORS = new Set(["answer_too_late", "round_not_open"]);

function isOpen(questionIndex: number) {
  return (entry: LoggedRound) =>
    entry.view.phase === "QUESTION_OPEN" && entry.view.questionIndex === questionIndex;
}

function isRevealed(questionIndex: number) {
  return (entry: LoggedRound) =>
    entry.view.phase === "QUESTION_REVEAL" && entry.view.questionIndex === questionIndex;
}

function asOpen(entry: LoggedRound): OpenRound {
  if (entry.view.phase !== "QUESTION_OPEN") throw new SimulationError("Expected an open Round");
  return entry.view;
}

function asRevealed(entry: LoggedRound): RevealedRound {
  if (entry.view.phase !== "QUESTION_REVEAL")
    throw new SimulationError("Expected a revealed Round");
  return entry.view;
}

function sleepUntil(targetMs: number): Promise<void> {
  const remaining = targetMs - performance.now();
  return remaining > 0
    ? new Promise((resolve) => setTimeout(resolve, remaining))
    : Promise.resolve();
}

function expectedOutcome(cohort: Cohort, questionIndex: number): ExpectedOutcome {
  const plan = planFor(cohort, questionIndex);
  if (plan.kind === "wait-for-deadline") return { answered: false, correct: false };
  return { answered: true, correct: plan.choice === "correct" };
}

class MatchRun {
  readonly invariants = new Invariants();
  readonly tally: Tally = {
    accepted: 0,
    wrong: 0,
    unanswered: 0,
    duplicateRejections: 0,
    exactKeyReplays: 0,
    lateRejections: {},
  };
  readonly roundPoints = new Map<string, number[]>();
  private revealChecks = 0;
  private lastAnswerAckAt = 0;
  private readonly lockedAnswers = new Map<string, LockedAnswer>();
  private readonly resumeCounts = { attempted: 0, succeeded: 0 };
  private leaderboardsConverged = 0;
  private finalResultsVerified = 0;
  private ranks: Map<string, number> | null = null;

  constructor(
    private readonly session: RoomSession,
    private readonly questionCount: number,
  ) {}

  async run(): Promise<MatchStageResult> {
    const { session } = this;
    const { rules } = session.lobby;
    const startedAt = performance.now();
    const start = await timed(
      session.recorder,
      "roomStartAck",
      (acknowledge) =>
        session.host.socket.emit(
          "room:start",
          { roomId: session.roomId, idempotencyKey: randomUUID() },
          acknowledge,
        ),
      (response) => {
        const parsed = roomStartResponseSchema.parse(response);
        return parsed.ok ? parsed : refused("Match start", parsed);
      },
      "Match start",
    );
    this.invariants.check(start.lobby.phase !== "LOBBY", "Room stayed in LOBBY after start");

    let commandSentAt = startedAt;
    for (let index = 0; index < this.questionCount; index += 1) {
      await this.playRound(index, commandSentAt);
      commandSentAt = await this.advance(index);
    }
    await this.checkFinalResults();
    for (const leak of session.secrecy.leaks) {
      this.invariants.check(false, `Disclosure before reveal: ${leak}`);
    }
    this.invariants.throwIfBroken();

    return {
      questionsCompleted: this.questionCount,
      acceptedAnswers: this.tally.accepted,
      wrongAnswers: this.tally.wrong,
      unansweredParticipantRounds: this.tally.unanswered,
      duplicateRejections: this.tally.duplicateRejections,
      exactKeyReplays: this.tally.exactKeyReplays,
      lateRejections: this.tally.lateRejections,
      revealChecks: this.revealChecks,
      resumes: this.resumeCounts,
      leaderboardsConverged: this.leaderboardsConverged,
      finalResultsVerified: this.finalResultsVerified,
      secrecy: { payloadsScanned: session.secrecy.scanned, leaks: session.secrecy.leaks.length },
      timing: {
        roundDurationMs: rules.roundDurationMs,
        maxDelayCompensationMs: rules.maxDelayCompensationMs,
        scoreBucketMs: rules.scoreBucketMs,
      },
      roundPoints: this.roundPoints,
    };
  }

  private async playRound(index: number, commandSentAt: number): Promise<void> {
    const { session } = this;
    const viewers = [session.host.log, ...session.participants.map((p) => p.log)];
    const opened = await Promise.all(
      viewers.map((log) => log.waitForRound(isOpen(index), `Round ${index} open`, STEP_TIMEOUT_MS)),
    );
    for (const entry of opened) {
      session.recorder.record("hostCommandToRoundState", entry.arrivedAt - commandSentAt);
    }
    this.lockedAnswers.clear();
    this.checkOpenViews(index);

    await this.answerRound(index);

    const revealTimeout = session.lobby.rules.roundDurationMs + REVEAL_WAIT_MARGIN_MS;
    const revealed = await Promise.all(
      viewers.map((log) =>
        log.waitForRound(isRevealed(index), `Round ${index} reveal`, revealTimeout),
      ),
    );
    if (index > LATE_ROUND_INDEX) {
      for (const entry of revealed) {
        session.recorder.record("lastAnswerAckToReveal", entry.arrivedAt - this.lastAnswerAckAt);
      }
    }
    this.checkReveals(index);
  }

  /**
   * The `correct` cohort answers last. Until then a connected Participant is still unanswered, so
   * the Round stays open for the duplicate and replay checks. In the late Round the late cohort
   * stays silent until the deadline, which keeps the Round from closing early.
   */
  private async answerRound(index: number): Promise<void> {
    const waiting = this.session.participants.filter(
      (p) => planFor(p.cohort, index).kind === "wait-for-deadline",
    );
    const closers = this.session.participants.filter(
      (p) => p.cohort === "correct" && !waiting.includes(p),
    );
    const early = this.session.participants.filter(
      (p) => !waiting.includes(p) && !closers.includes(p),
    );
    const waitingRuns = waiting.map((p) => this.act(p, index));
    await Promise.all(early.map((p) => this.act(p, index)));
    if (index === RESUME_ROUND_INDEX) {
      const resuming = this.session.participants.filter(
        (p) => !waiting.includes(p) && resumesMidRound(p.cohort, p.number),
      );
      await Promise.all(resuming.map((p) => this.resume(p, index)));
    }
    await Promise.all(closers.map((p) => this.act(p, index)));
    await Promise.all(waitingRuns);
  }

  private checkOpenViews(index: number): void {
    const { invariants, session } = this;
    const hostOpen = asOpen(this.entryOf(session.host.log, isOpen(index)));
    const hostProblem = fixtureMismatch(index, hostOpen.question);
    invariants.check(hostProblem === null, `Host: ${hostProblem}`);
    invariants.check(hostOpen.questionCount === this.questionCount, "Host question count differs");
    for (const participant of session.participants) {
      const view = asOpen(this.entryOf(participant.log, isOpen(index)));
      const problem = fixtureMismatch(index, view.question);
      invariants.check(problem === null, `Participant ${participant.number}: ${problem}`);
      invariants.check(
        view.answer === null,
        `Participant ${participant.number} opened with an Answer`,
      );
      invariants.check(
        view.endsAt > view.startsAt,
        `Participant ${participant.number} deadline invalid`,
      );
    }
  }

  private entryOf(log: { rounds: LoggedRound[] }, matches: (entry: LoggedRound) => boolean) {
    const entry = log.rounds.find(matches);
    if (!entry) throw new SimulationError("Expected Round event is missing");
    return entry;
  }

  private answer(participant: SimulatedParticipant, index: number, optionId: string, key: string) {
    return timed(
      this.session.recorder,
      "roundAnswerAck",
      (acknowledge) =>
        participant.socket.emit(
          "round:answer",
          { roomId: this.session.roomId, questionIndex: index, optionId, idempotencyKey: key },
          acknowledge,
        ),
      (response) => roundAnswerResponseSchema.parse(response),
      `Participant ${participant.number} Answer`,
    );
  }

  private async act(participant: SimulatedParticipant, index: number): Promise<void> {
    const entry = this.entryOf(participant.log, isOpen(index));
    const view = asOpen(entry);
    const plan = planFor(participant.cohort, index);
    const who = `Participant ${participant.number} Q${index}`;

    if (plan.kind === "wait-for-deadline") {
      this.tally.unanswered += 1;
      const optionId = correctOptionId(index, view.question);
      if (!optionId) throw new SimulationError(`${who}: correct option not found in fixture`);
      await sleepUntil(entry.arrivedAt + (view.endsAt - view.serverTime) + LATE_ANSWER_MARGIN_MS);
      const late = await this.answer(participant, index, optionId, randomUUID());
      if (late.ok || !LATE_ANSWER_ERRORS.has(late.error)) {
        this.invariants.check(false, `${who}: a late Answer was not rejected as late`);
      } else {
        this.tally.lateRejections[late.error] = (this.tally.lateRejections[late.error] ?? 0) + 1;
      }
      return;
    }

    const chosen =
      plan.choice === "correct"
        ? correctOptionId(index, view.question)
        : wrongOptionId(index, view.question);
    if (!chosen) throw new SimulationError(`${who}: option not found in fixture`);
    const key = randomUUID();
    const first = await this.answer(participant, index, chosen, key);
    this.lastAnswerAckAt = performance.now();
    if (!first.ok || first.answer.optionId !== chosen || first.answer.questionIndex !== index) {
      this.invariants.check(false, `${who}: first Answer was not accepted as sent`);
      return;
    }
    this.tally.accepted += 1;
    this.lockedAnswers.set(participant.participantId, first.answer);
    if (plan.choice === "wrong") this.tally.wrong += 1;

    if (plan.extra === "duplicate") {
      const other = view.question.options.find((option) => option.id !== chosen)?.id ?? chosen;
      const second = await this.answer(participant, index, other, randomUUID());
      const rejected = !second.ok && second.error === "already_answered";
      this.invariants.check(rejected, `${who}: a new-key duplicate was not rejected`);
      if (rejected) this.tally.duplicateRejections += 1;
    }
    if (plan.extra === "replay") {
      const replay = await this.answer(participant, index, chosen, key);
      const same = JSON.stringify(replay) === JSON.stringify(first);
      this.invariants.check(same, `${who}: an exact-key replay did not return the first result`);
      if (same) this.tally.exactKeyReplays += 1;
    }
  }

  private pointsBefore(participantId: string, index: number): number {
    return (this.roundPoints.get(participantId) ?? [])
      .slice(0, index)
      .reduce((sum, points) => sum + points, 0);
  }

  /** Drops a Participant's socket mid-Round, resumes on a new one, and compares what comes back. */
  private async resume(participant: SimulatedParticipant, index: number): Promise<void> {
    const { invariants, session } = this;
    const who = `Participant ${participant.number} resume Q${index}`;
    const before = asOpen(this.entryOf(participant.log, isOpen(index)));
    const lockedBefore = this.lockedAnswers.get(participant.participantId) ?? null;
    await session.reconnect(participant);
    const response = await timed(
      session.recorder,
      "roomResumeAck",
      (acknowledge) =>
        participant.socket.emit(
          "room:resume",
          { joinCode: session.joinCode, resumeToken: participant.resumeToken },
          acknowledge,
        ),
      (reply) => {
        const parsed = roomResumeResponseSchema.parse(reply);
        return parsed.ok ? parsed : refused(who, parsed);
      },
      who,
    );
    session.secrecy.inspect(`${who} ack`, response);
    this.resumeCounts.attempted += 1;
    const problems = invariants.count;

    const roster = response.lobby.participants.filter(
      (entry) => entry.participantId === participant.participantId,
    );
    invariants.check(
      response.participant.participantId === participant.participantId,
      `${who}: identity changed`,
    );
    invariants.check(roster.length === 1, `${who}: roster does not list the Participant once`);
    invariants.check(
      response.lobby.participants.length === session.participants.length,
      `${who}: roster size changed`,
    );
    const after = response.round;
    invariants.check(
      after?.phase === "QUESTION_OPEN" && after.questionIndex === index,
      `${who}: not resumed into the open Round`,
    );
    if (after?.phase === "QUESTION_OPEN") {
      invariants.check(
        JSON.stringify(after.question.options) === JSON.stringify(before.question.options),
        `${who}: option ids or order changed`,
      );
      invariants.check(
        after.startsAt === before.startsAt && after.endsAt === before.endsAt,
        `${who}: deadline changed`,
      );
      invariants.check(
        JSON.stringify(after.answer) === JSON.stringify(lockedBefore),
        `${who}: Answer state changed`,
      );
    }
    invariants.check(
      response.score === this.pointsBefore(participant.participantId, index),
      `${who}: score differs from revealed Round points`,
    );
    if (invariants.count === problems) this.resumeCounts.succeeded += 1;
  }

  private totalsThrough(index: number): Map<string, number> {
    return new Map(
      this.session.participants.map((p) => [
        p.participantId,
        this.pointsBefore(p.participantId, index + 1),
      ]),
    );
  }

  private checkStandings(index: number, hostReveal: RevealedRound): void {
    const { invariants, session } = this;
    const reference = JSON.stringify(hostReveal.leaderboard);
    let converged = true;
    for (const participant of session.participants) {
      const reveal = asRevealed(this.entryOf(participant.log, isRevealed(index)));
      if (JSON.stringify(reveal.leaderboard) !== reference) converged = false;
      invariants.check(
        JSON.stringify(reveal.leaderboard) === reference,
        `Participant ${participant.number} reveal ${index}: Leaderboard differs from the Host's`,
      );
    }
    this.ranks = checkLeaderboard(
      invariants,
      `Reveal ${index}`,
      hostReveal.leaderboard,
      this.totalsThrough(index),
      this.ranks,
    );
    if (converged) this.leaderboardsConverged += 1;
  }

  private async checkFinalResults(): Promise<void> {
    const { invariants, session } = this;
    const logs = [session.host.log, ...session.participants.map((p) => p.log)];
    const isSaved = (lobby: LobbySnapshot) =>
      lobby.phase === "FINISHED" && lobby.results !== undefined;
    const lobbies = await Promise.all(
      logs.map((log) => log.waitForLobby(isSaved, "Final results")),
    );
    const reference = JSON.stringify(lobbies[0]?.results);
    invariants.check(
      lobbies.every((lobby) => JSON.stringify(lobby.results) === reference),
      "Final results differ between viewers",
    );

    const expected = new Map<string, ExpectedFinal>(
      session.participants.map((p) => [
        p.participantId,
        {
          displayName: p.displayName,
          correctAnswers: Array.from(
            { length: this.questionCount },
            (_, i) => expectedOutcome(p.cohort, i).correct,
          ).filter(Boolean).length,
        },
      ]),
    );
    const results = lobbies[0]?.results ?? [];
    checkFinalResults(
      invariants,
      results,
      this.totalsThrough(this.questionCount - 1),
      this.ranks ?? new Map(),
      expected,
      this.questionCount,
    );
    this.finalResultsVerified = results.length;
  }

  private checkReveals(index: number): void {
    const { invariants, session } = this;
    const fixture = STARTER_FIXTURE[index];
    const hostReveal = asRevealed(this.entryOf(session.host.log, isRevealed(index)));
    invariants.check(
      hostReveal.correctOptionId === fixture?.hostCorrectOptionId,
      `Host reveal ${index}: wrong correct option`,
    );
    invariants.check(hostReveal.result === null, `Host reveal ${index} carried a result`);
    const referenceScores = JSON.stringify(hostReveal.scores);
    invariants.check(
      hostReveal.scores.length === session.participants.length,
      `Reveal ${index}: score count differs from joined Participants`,
    );

    for (const participant of session.participants) {
      this.checkParticipantReveal(participant, index, referenceScores);
    }

    for (const score of hostReveal.scores) {
      const points = this.roundPoints.get(score.participantId) ?? [];
      points[index] = score.points;
      this.roundPoints.set(score.participantId, points);
    }
    this.checkStandings(index, hostReveal);
    this.revealChecks += 1;
  }

  private checkParticipantReveal(
    participant: SimulatedParticipant,
    index: number,
    referenceScores: string,
  ): void {
    const { invariants } = this;
    const who = `Participant ${participant.number} reveal ${index}`;
    const open = asOpen(this.entryOf(participant.log, isOpen(index)));
    const reveal = asRevealed(this.entryOf(participant.log, isRevealed(index)));
    const expected = expectedOutcome(participant.cohort, index);
    const ownCorrect = correctOptionId(index, open.question);

    invariants.check(reveal.correctOptionId === ownCorrect, `${who}: wrong correct option`);
    invariants.check(
      JSON.stringify(reveal.scores) === referenceScores,
      `${who}: scores differ from the Host's`,
    );
    invariants.check(
      (reveal.answer !== null) === expected.answered,
      `${who}: Answer state differs`,
    );
    const result = reveal.result;
    invariants.check(result?.correct === expected.correct, `${who}: correctness differs`);
    const points = result?.points ?? -1;
    const pointsFit = expected.correct
      ? points >= MIN_POINTS && points <= MAX_POINTS
      : points === 0;
    invariants.check(pointsFit, `${who}: ${points} points do not fit the expected case`);

    const entry = reveal.scores.find((score) => score.participantId === participant.participantId);
    invariants.check(
      entry?.answered === expected.answered &&
        entry?.correct === expected.correct &&
        entry?.points === points,
      `${who}: score entry differs from own result`,
    );
  }

  private async advance(index: number): Promise<number> {
    const { session } = this;
    const sentAt = performance.now();
    const response = await timed(
      session.recorder,
      "roomAdvanceAck",
      (acknowledge) =>
        session.host.socket.emit(
          "room:advance",
          { roomId: session.roomId, idempotencyKey: randomUUID() },
          acknowledge,
        ),
      (reply) => {
        const parsed = roomAdvanceResponseSchema.parse(reply);
        return parsed.ok ? parsed : refused(`Advance after Question ${index}`, parsed);
      },
      `Advance after Question ${index}`,
    );
    this.session.secrecy.inspect("Host advance ack", response);
    const last = index === this.questionCount - 1;
    const finished = (lobby: LobbySnapshot) => lobby.phase === "FINISHED";
    this.invariants.check(
      last ? finished(response.lobby) && response.round === null : response.round !== null,
      `Advance after Question ${index}: unexpected Room state`,
    );
    return sentAt;
  }
}

export async function playMatch(session: RoomSession): Promise<MatchStageResult> {
  const run = new MatchRun(session, session.lobby.questionCount);
  const result = await run.run();
  const expected = expectedCounts(session.participants.length, session.lobby.questionCount);
  const check = new Invariants();
  check.check(
    result.acceptedAnswers === expected.accepted,
    "Accepted Answer count differs from plan",
  );
  check.check(
    result.duplicateRejections === expected.duplicateRejections,
    "Duplicate rejection count differs from plan",
  );
  check.check(
    result.exactKeyReplays === expected.exactKeyReplays,
    "Replay count differs from plan",
  );
  check.check(
    Object.values(result.lateRejections).reduce((sum, count) => sum + count, 0) ===
      expected.lateRejections,
    "Late rejection count differs from plan",
  );
  check.check(
    result.unansweredParticipantRounds === expected.unanswered,
    "Unanswered count differs",
  );
  check.throwIfBroken();
  return result;
}
