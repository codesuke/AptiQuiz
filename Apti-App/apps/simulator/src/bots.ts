import { readBotsConfig } from "./bots-config.js";
import { type BotsResult, BotsRun } from "./bots-run.js";
import { ConfigError } from "./config.js";
import { describeFailure, scrubSecrets } from "./report.js";
import type { LatencySummary } from "./stats.js";

interface BotsReport {
  ok: boolean;
  target: string;
  botsRequested: number;
  result: Omit<BotsResult, "secretValues"> | null;
  latencyMs: Record<string, LatencySummary>;
  errors: string[];
  durationMs: number;
}

async function main(): Promise<number> {
  const startedAt = performance.now();
  let config: ReturnType<typeof readBotsConfig>;
  try {
    config = readBotsConfig(process.env);
  } catch (error) {
    const message = error instanceof ConfigError ? error.message : "Invalid configuration";
    console.error(JSON.stringify({ ok: false, errors: [message] }, null, 2));
    return 1;
  }

  const run = new BotsRun(config);
  const report: BotsReport = {
    ok: false,
    target: config.gameServerUrl,
    botsRequested: config.botCount,
    result: null,
    latencyMs: {},
    errors: [],
    durationMs: 0,
  };
  try {
    const { secretValues: _secretValues, ...result } = await run.run();
    report.result = result;
    report.ok = true;
  } catch (error) {
    report.errors.push(...describeFailure(error));
  } finally {
    run.close();
  }
  report.latencyMs = run.latency;
  report.durationMs = Math.round(performance.now() - startedAt);
  console.log(scrubSecrets(JSON.stringify(report, null, 2), run.secretValues()));
  return report.ok ? 0 : 1;
}

process.exitCode = await main();
