import { ConfigError, readConfig, secretsOf } from "./config.js";
import { playMatch } from "./match-run.js";
import { describeFailure, formatReport, type SimulatorReport, scrubSecrets } from "./report.js";
import { openLobby, type RoomSession, summarizeLobby } from "./session.js";
import { obtainHostAccess } from "./setup.js";
import { LatencyRecorder } from "./stats.js";

const OVERALL_TIMEOUT_MS = 300_000;

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

  const configSecrets = secretsOf(config);
  const recorder = new LatencyRecorder();
  const report: SimulatorReport = {
    ok: false,
    target: config.gameServerUrl,
    requestedParticipants: config.participantCount,
    lobby: null,
    match: null,
    latencyMs: {},
    errors: [],
    durationMs: 0,
  };
  let session: RoomSession | null = null;
  let hostTicket = "";
  const secrets = () => [...configSecrets, hostTicket, ...(session?.secretValues() ?? [])];
  const finish = () => {
    report.latencyMs = recorder.summaries();
    report.durationMs = Math.round(performance.now() - startedAt);
    console.log(formatReport(report, secrets()));
  };
  const watchdog = setTimeout(() => {
    report.errors.push(`Run exceeded ${OVERALL_TIMEOUT_MS}ms`);
    session?.close();
    finish();
    process.exit(1);
  }, OVERALL_TIMEOUT_MS);

  try {
    const access = await obtainHostAccess(config.setup);
    hostTicket = access.hostTicket;
    session = await openLobby(config, access, recorder);
    report.lobby = summarizeLobby(session, config.participantCount);
    const { roundPoints: _roundPoints, ...match } = await playMatch(session);
    report.match = match;
    report.ok = true;
  } catch (error) {
    report.errors.push(...describeFailure(error).map((line) => scrubSecrets(line, secrets())));
  } finally {
    clearTimeout(watchdog);
    session?.close();
  }

  finish();
  return report.ok ? 0 : 1;
}

process.exitCode = await main();
