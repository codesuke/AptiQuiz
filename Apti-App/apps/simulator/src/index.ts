import { ConfigError, readConfig, secretsOf } from "./config.js";
import { runLobbyStage } from "./lobby-run.js";
import { formatReport, type SimulatorReport, scrubSecrets } from "./report.js";
import { obtainHostAccess } from "./setup.js";

const OVERALL_TIMEOUT_MS = 120_000;

async function main(): Promise<number> {
  const startedAt = performance.now();
  let config: ReturnType<typeof readConfig>;
  try {
    config = readConfig(process.env);
  } catch (error) {
    // Configuration is invalid, so nothing connects. The message never echoes a value.
    const message = error instanceof ConfigError ? error.message : "Invalid configuration";
    console.error(JSON.stringify({ ok: false, errors: [message] }, null, 2));
    return 1;
  }

  const secrets = secretsOf(config);
  const report: SimulatorReport = {
    ok: false,
    target: config.gameServerUrl,
    requestedParticipants: config.participantCount,
    lobby: null,
    errors: [],
    durationMs: 0,
  };
  const watchdog = setTimeout(() => {
    report.errors.push(`Run exceeded ${OVERALL_TIMEOUT_MS}ms`);
    report.durationMs = Math.round(performance.now() - startedAt);
    console.log(formatReport(report, secrets));
    process.exit(1);
  }, OVERALL_TIMEOUT_MS);

  try {
    const access = await obtainHostAccess(config.setup);
    report.lobby = await runLobbyStage(config, access);
    report.ok = true;
  } catch (error) {
    report.errors.push(
      scrubSecrets(error instanceof Error ? error.message : "Unknown error", secrets),
    );
  } finally {
    clearTimeout(watchdog);
  }

  report.durationMs = Math.round(performance.now() - startedAt);
  console.log(formatReport(report, secrets));
  return report.ok ? 0 : 1;
}

process.exitCode = await main();
