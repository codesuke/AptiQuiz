import { randomUUID } from "node:crypto";
import {
  type LobbySnapshot,
  type RevealedRound,
  type RoundView,
  roundAnswerResponseSchema,
  roundViewSchema,
} from "@aptiquiz/contracts";
import { planBotRound } from "./bot-plan.js";
import type { BotsConfig } from "./bots-config.js";
import { EventLog } from "./event-log.js";
import { Invariants } from "./invariants.js";
import { SimulationError } from "./rpc.js";
import {
  awaitConnection,
  connect,
  listen,
  pingAndJoin,
  SecrecyMonitor,
  type SimulatorSocket,
} from "./session.js";
import { checkFinalResults, checkLeaderboard, type ExpectedFinal } from "./standings.js";
import { LatencyRecorder, type LatencySummary } from "./stats.js";

const MIN_POINTS = 500;
const MAX_POINTS = 1000;

interface Bot {
  number: number;
  displayName: string;
  participantId: string;
  resumeToken: string;
  socket: SimulatorSocket;
  log: EventLog;
  /** The option this bot sent for each Question, in the ids it was shown. */
  chosen: Map<number, string>;
}

export interface BotsResult {
  botsJoined: number;
  /** Everyone else in the Room at the end, normally the people playing alongside the bots. */
  otherParticipants: number;
  questionsPlayed: number;
  answers: { sent: number; accepted: number; refused: Record<string, number>; skipped: number };
  leaderboardsConverged: number;
  finalResultsVerified: number;
  secrecy: { payloadsScanned: number; leaks: number };
  latencyMs: Record<string, LatencySummary>;
  secretValues: string[];
}

type OpenRound = Extract<RoundView, { phase: "QUESTION_OPEN" }>;

function isOpen(view: RoundView): view is OpenRound {
  return view.phase === "QUESTION_OPEN";
}

function isSaved(lobby: LobbySnapshot): boolean {
  return lobby.phase === "FINISHED" && lobby.results !== undefined;
}

function progress(message: string): void {
  console.error(`[bots] ${message}`);
}

export class BotsRun {
  private readonly invariants = new Invariants();
  private readonly recorder = new LatencyRecorder();
  private readonly secrecy = new SecrecyMonitor();
  private readonly sockets: SimulatorSocket[] = [];
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly bots: Bot[] = [];
  private readonly answers = {
    sent: 0,
    accepted: 0,
    refused: {} as Record<string, number>,
    skipped: 0,
  };
  private roomId = "";

  constructor(private readonly config: BotsConfig) {}

  close(): void {
    for (const timer of this.timers) clearTimeout(timer);
    for (const socket of this.sockets) socket.disconnect();
  }

  secretValues(): string[] {
    return this.bots.map((bot) => bot.resumeToken);
  }

  async run(): Promise<BotsResult> {
    await this.joinAll();
    progress(`${this.bots.length} bots joined. Start the match from the Host screen.`);
    const finished = await Promise.all(
      this.bots.map((bot) =>
        bot.log.waitForLobby(
          isSaved,
          "Waiting for the Host to finish the match",
          this.config.waitMs,
        ),
      ),
    );
    const finalLobby = finished[0];
    if (!finalLobby) throw new SimulationError("No bot saw the final results");
    const questionsPlayed = this.checkMatch(finalLobby, finished);
    for (const leak of this.secrecy.leaks) {
      this.invariants.check(false, `Disclosure before reveal: ${leak}`);
    }
    this.invariants.throwIfBroken();

    return {
      botsJoined: this.bots.length,
      otherParticipants: finalLobby.participants.length - this.bots.length,
      questionsPlayed,
      answers: this.answers,
      leaderboardsConverged: questionsPlayed,
      finalResultsVerified: finalLobby.results?.length ?? 0,
      secrecy: { payloadsScanned: this.secrecy.scanned, leaks: this.secrecy.leaks.length },
      latencyMs: this.recorder.summaries(),
      secretValues: this.secretValues(),
    };
  }

  private async joinAll(): Promise<void> {
    const numbers = Array.from({ length: this.config.botCount }, (_, index) => index + 1);
    await Promise.all(
      numbers.map(async (number) => {
        const label = `Bot ${number}`;
        const socket = connect(this.config.gameServerUrl, null);
        this.sockets.push(socket);
        const log = new EventLog((from, payload) => this.secrecy.inspect(from, payload));
        listen(socket, label, log);
        socket.on("round:state", (payload) => this.onRound(number, payload));
        await awaitConnection(socket, label);
        const displayName = `Bot ${String(number).padStart(2, "0")}`;
        const joined = await pingAndJoin(
          { number, socket },
          this.config.joinCode,
          displayName,
          this.recorder,
        );
        this.secrecy.inspect(`${label} join ack`, joined);
        this.roomId = joined.lobby.roomId;
        const bot: Bot = {
          number,
          displayName,
          participantId: joined.participant.participantId,
          resumeToken: joined.resumeToken,
          socket,
          log,
          chosen: new Map(),
        };
        this.bots.push(bot);
        if (joined.round && isOpen(joined.round)) this.schedule(bot, joined.round);
      }),
    );
  }

  private onRound(botNumber: number, payload: unknown): void {
    const parsed = roundViewSchema.safeParse(payload);
    const bot = this.bots.find((candidate) => candidate.number === botNumber);
    if (parsed.success && bot && isOpen(parsed.data)) this.schedule(bot, parsed.data);
  }

  private schedule(bot: Bot, view: OpenRound): void {
    if (bot.chosen.has(view.questionIndex) || view.answer) return;
    const plan = planBotRound({
      botNumber: bot.number,
      questionIndex: view.questionIndex,
      optionCount: view.question.options.length,
      remainingMs: view.endsAt - view.serverTime,
      maxAnswerDelayMs: this.config.maxAnswerDelayMs,
      skipPercent: this.config.skipPercent,
    });
    if (plan.kind === "skip") {
      this.answers.skipped += 1;
      bot.chosen.set(view.questionIndex, "");
      return;
    }
    const optionId = view.question.options[plan.optionIndex]?.id;
    if (!optionId) return;
    bot.chosen.set(view.questionIndex, optionId);
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.sendAnswer(bot, view.questionIndex, optionId);
    }, plan.delayMs);
    this.timers.add(timer);
  }

  private sendAnswer(bot: Bot, questionIndex: number, optionId: string): void {
    const sentAt = performance.now();
    this.answers.sent += 1;
    bot.socket.emit(
      "round:answer",
      { roomId: this.roomId, questionIndex, optionId, idempotencyKey: randomUUID() },
      (response) => {
        this.recorder.record("roundAnswerAck", performance.now() - sentAt);
        this.secrecy.inspect(`${bot.displayName} Answer ack`, response);
        const parsed = roundAnswerResponseSchema.safeParse(response);
        if (parsed.success && parsed.data.ok) {
          this.answers.accepted += 1;
          return;
        }
        const code = parsed.success && !parsed.data.ok ? parsed.data.error : "invalid_response";
        this.answers.refused[code] = (this.answers.refused[code] ?? 0) + 1;
        this.invariants.check(
          false,
          `${bot.displayName} Q${questionIndex}: Answer refused (${code})`,
        );
      },
    );
  }

  private revealOf(bot: Bot, questionIndex: number): RevealedRound | null {
    for (const entry of bot.log.rounds) {
      const view = entry.view;
      if (view.phase === "QUESTION_REVEAL" && view.questionIndex === questionIndex) return view;
    }
    return null;
  }

  /** Cross-checks every bot's view of the finished match; returns the number of Questions played. */
  private checkMatch(finalLobby: LobbySnapshot, finished: readonly LobbySnapshot[]): number {
    const { invariants } = this;
    const count = finalLobby.questionCount;
    const reference = JSON.stringify(finalLobby.results);
    invariants.check(
      finished.every((lobby) => JSON.stringify(lobby.results) === reference),
      "Final results differ between bots",
    );

    const totals = new Map(finalLobby.participants.map((p) => [p.participantId, 0]));
    const correctCounts = new Map(finalLobby.participants.map((p) => [p.participantId, 0]));
    let ranks: Map<string, number> | null = null;

    for (let index = 0; index < count; index += 1) {
      const reveals = this.bots.map((bot) => this.revealOf(bot, index));
      const first = reveals[0];
      invariants.check(
        reveals.every((reveal) => reveal !== null),
        `Question ${index}: a bot never saw the reveal`,
      );
      if (!first) continue;
      for (const score of first.scores) {
        totals.set(score.participantId, (totals.get(score.participantId) ?? 0) + score.points);
        if (score.correct) {
          correctCounts.set(score.participantId, (correctCounts.get(score.participantId) ?? 0) + 1);
        }
      }
      const scores = JSON.stringify(first.scores);
      const board = JSON.stringify(first.leaderboard);
      invariants.check(
        reveals.every(
          (r) =>
            r === null ||
            (JSON.stringify(r.scores) === scores && JSON.stringify(r.leaderboard) === board),
        ),
        `Question ${index}: scores or Leaderboard differ between bots`,
      );
      ranks = checkLeaderboard(invariants, `Reveal ${index}`, first.leaderboard, totals, ranks);
      for (const [position, bot] of this.bots.entries()) {
        this.checkOwnReveal(bot, index, reveals[position] ?? null);
      }
    }

    const expected = new Map<string, ExpectedFinal>(
      finalLobby.participants.map((p) => [
        p.participantId,
        { displayName: p.displayName, correctAnswers: correctCounts.get(p.participantId) ?? 0 },
      ]),
    );
    checkFinalResults(
      invariants,
      finalLobby.results ?? [],
      totals,
      ranks ?? new Map(),
      expected,
      count,
    );
    return count;
  }

  /** A bot knows what it sent, so it can check its own result without knowing the Question set. */
  private checkOwnReveal(bot: Bot, index: number, reveal: RevealedRound | null): void {
    if (!reveal) return;
    const who = `${bot.displayName} reveal ${index}`;
    const sent = bot.chosen.get(index) || null;
    const result = reveal.result;
    const { invariants } = this;
    invariants.check(
      (reveal.answer?.optionId ?? null) === sent,
      `${who}: locked Answer differs from the one sent`,
    );
    const correct = sent !== null && sent === reveal.correctOptionId;
    invariants.check(
      result?.correct === correct,
      `${who}: correctness differs from the option sent`,
    );
    const points = result?.points ?? -1;
    const fits = correct ? points >= MIN_POINTS && points <= MAX_POINTS : points === 0;
    invariants.check(fits, `${who}: ${points} points do not fit the result`);
  }

  get latency(): Record<string, LatencySummary> {
    return this.recorder.summaries();
  }
}
