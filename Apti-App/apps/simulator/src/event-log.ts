import { type LobbySnapshot, type RoundView, roundViewSchema } from "@aptiquiz/contracts";
import { SimulationError, withTimeout } from "./rpc.js";

export interface LoggedRound {
  view: RoundView;
  arrivedAt: number;
}

type Waiter = { matches: (entry: LoggedRound) => boolean; resolve: (entry: LoggedRound) => void };
type LobbyWaiter = {
  matches: (lobby: LobbySnapshot) => boolean;
  resolve: (l: LobbySnapshot) => void;
};

/** Everything one socket received, kept so later stages can wait for and compare events. */
export class EventLog {
  readonly rounds: LoggedRound[] = [];
  readonly lobbies: LobbySnapshot[] = [];
  private readonly waiters: Waiter[] = [];
  private readonly lobbyWaiters: LobbyWaiter[] = [];

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
    for (const waiter of this.lobbyWaiters.filter((candidate) => candidate.matches(snapshot))) {
      this.lobbyWaiters.splice(this.lobbyWaiters.indexOf(waiter), 1);
      waiter.resolve(snapshot);
    }
  }

  waitForLobby(
    matches: (lobby: LobbySnapshot) => boolean,
    step: string,
    timeoutMs?: number,
  ): Promise<LobbySnapshot> {
    const existing = this.lobbies.find(matches);
    if (existing) return Promise.resolve(existing);
    const arrival = new Promise<LobbySnapshot>((resolve) =>
      this.lobbyWaiters.push({ matches, resolve }),
    );
    return withTimeout(arrival, step, timeoutMs);
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
