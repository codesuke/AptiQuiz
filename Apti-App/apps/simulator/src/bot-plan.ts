/** Same input, same output: a bot's behaviour in a Round is reproducible from its number. */
function unitInterval(seed: number): number {
  let state = (seed + 0x6d2b79f5) | 0;
  state = Math.imul(state ^ (state >>> 15), state | 1);
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
}

/** Time the bot keeps clear of the deadline, so its Answer is never meant to be late. */
export const DEADLINE_SAFETY_MS = 1_500;

export type BotPlan = { kind: "skip" } | { kind: "answer"; delayMs: number; optionIndex: number };

export function planBotRound(input: {
  botNumber: number;
  questionIndex: number;
  optionCount: number;
  remainingMs: number;
  maxAnswerDelayMs: number;
  skipPercent: number;
}): BotPlan {
  const seed = input.botNumber * 1_000 + input.questionIndex;
  if (unitInterval(seed) * 100 < input.skipPercent) return { kind: "skip" };
  const room = Math.max(0, input.remainingMs - DEADLINE_SAFETY_MS);
  const ceiling = Math.min(input.maxAnswerDelayMs, room);
  return {
    kind: "answer",
    delayMs: Math.floor(unitInterval(seed + 1) * ceiling),
    optionIndex: Math.floor(unitInterval(seed + 2) * input.optionCount),
  };
}
