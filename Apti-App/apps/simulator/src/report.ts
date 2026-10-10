import { InvariantFailure } from "./invariants.js";
import type { MatchStageResult } from "./match-run.js";
import type { LobbyStageResult } from "./session.js";
import type { LatencySummary } from "./stats.js";

export interface SimulatorReport {
  ok: boolean;
  target: string;
  requestedParticipants: number;
  lobby: LobbyStageResult | null;
  match: Omit<MatchStageResult, "roundPoints"> | null;
  /** Client-observed durations in this process, in milliseconds, labelled by what was measured. */
  latencyMs: Record<string, LatencySummary>;
  errors: string[];
  durationMs: number;
}

const REDACTED = "[redacted]";

/** Replaces every secret value with a marker, so no log, report, or error can disclose one. */
export function scrubSecrets(text: string, secrets: readonly string[]): string {
  return secrets
    .filter((secret) => secret.length > 0)
    .reduce((scrubbed, secret) => scrubbed.split(secret).join(REDACTED), text);
}

export function formatReport(report: SimulatorReport, secrets: readonly string[]): string {
  return scrubSecrets(JSON.stringify(report, null, 2), secrets);
}

export function describeFailure(error: unknown): string[] {
  if (error instanceof InvariantFailure) return [...error.details];
  return [error instanceof Error ? error.message : "Unknown error"];
}
