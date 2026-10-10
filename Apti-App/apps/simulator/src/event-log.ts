import { type LobbySnapshot, type RoundView, roundViewSchema } from "@aptiquiz/contracts";
import { SimulationError, withTimeout } from "./rpc.js";

export interface LoggedRound {
  view: RoundView;
  arrivedAt: number;
}

type Waiter = { matches: (entry: LoggedRound) => boolean; resolve: (entry: LoggedRound) => void };

/** Everything one socket received, kept so later stages can wait for and compare events. */
export class EventLog {
  readonly rounds: LoggedRound[] = [];
  readonly lobbies: LobbySnapshot[] = [];
  private readonly waiters: Waiter[] = [];

  constructor(private readonly inspect: (label: string, payload: unknown) => void) {}

  recordRound(label: string, payload: unknown): void {
    this.inspect(label, payload);
    const parsed = roundViewSchema.safeParse(payload);
    if (!parsed.success) throw new SimulationError(`${label}: round:state failed validation`);
    const entry = { view: parsed.data, arrivedAt: performance.now() };
    this.rounds.push(entry);
    for (const waiter of this.waiters.filter((candidate) => candidate.matches(entry))) {
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(entry);
    }
  }

  recordLobby(label: string, snapshot: LobbySnapshot): void {
    this.inspect(label, snapshot);
    this.lobbies.push(snapshot);
  }

  waitForRound(
    matches: (entry: LoggedRound) => boolean,
    step: string,
    timeoutMs?: number,
  ): Promise<LoggedRound> {
    const existing = this.rounds.find(matches);
    if (existing) return Promise.resolve(existing);
    const arrival = new Promise<LoggedRound>((resolve) => this.waiters.push({ matches, resolve }));
    return withTimeout(arrival, step, timeoutMs);
  }
}
