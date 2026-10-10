/** Property names that would disclose correctness, an explanation, or points before the reveal. */
const FORBIDDEN_KEYS = new Set([
  "correctoptionid",
  "correct",
  "iscorrect",
  "correctanswers",
  "explanation",
  "result",
  "points",
  "scores",
  "leaderboard",
]);

function isRevealedRound(value: object): boolean {
  return "phase" in value && value.phase === "QUESTION_REVEAL";
}

function isFinishedLobby(value: object): boolean {
  return "phase" in value && value.phase === "FINISHED" && "results" in value;
}

/**
 * Walks one received payload and returns the paths of forbidden properties. A revealed Round view
 * and a finished Lobby are post-reveal data, so they are not scanned.
 */
export function findPreRevealLeaks(payload: unknown, path = "$"): string[] {
  if (typeof payload !== "object" || payload === null) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => findPreRevealLeaks(item, `${path}[${index}]`));
  }
  if (isRevealedRound(payload) || isFinishedLobby(payload)) return [];
  return Object.entries(payload).flatMap(([key, value]) => {
    const here = `${path}.${key}`;
    const own = FORBIDDEN_KEYS.has(key.toLowerCase()) ? [here] : [];
    return [...own, ...findPreRevealLeaks(value, here)];
  });
}
