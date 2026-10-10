import type { LobbyStageResult } from "./lobby-run.js";

export interface SimulatorReport {
  ok: boolean;
  target: string;
  requestedParticipants: number;
  lobby: LobbyStageResult | null;
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
