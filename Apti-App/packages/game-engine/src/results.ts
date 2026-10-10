import { rankStandings } from "./standings.js";

/** An accepted Answer as the Game Server recorded it. */
export interface ResultAnswer {
  readonly participantId: string;
  readonly questionIndex: number;
  readonly correct: boolean;
  readonly points: number;
  readonly effectiveResponseMs: number;
}

export interface MatchParticipant {
  readonly participantId: string;
  /** Server time the Participant joined the Lobby. */
  readonly joinedAt: number;
}

export interface TopicTally {
  readonly topic: string;
  readonly correct: number;
  readonly total: number;
}

export interface ParticipantSummary {
  readonly participantId: string;
  readonly rank: number;
  readonly totalScore: number;
  readonly correctAnswers: number;
  /** Every Question of the Room, so unanswered Questions stay in the accuracy denominator. */
  readonly questionCount: number;
  /** Rounded mean Effective Response Time of all accepted Answers; null without any. */
  readonly averageResponseMs: number | null;
  /** One entry per Topic of the Room, in order of first appearance. */
  readonly topics: readonly TopicTally[];
}

export interface MatchSummaryInput {
  /** The Topic of each Question, indexed by question index. */
  readonly questionTopics: readonly string[];
  readonly participants: readonly MatchParticipant[];
  readonly answers: readonly ResultAnswer[];
}

/** Final per-Participant metrics, ordered by final rank. */
export function summarizeMatch(input: MatchSummaryInput): ParticipantSummary[] {
  const { questionTopics, participants, answers } = input;
  const topicOrder = [...new Set(questionTopics)];

  const summaries = participants.map(({ participantId, joinedAt }) => {
    const own = answers.filter((answer) => answer.participantId === participantId);
    const correct = own.filter((answer) => answer.correct);

    return {
      participantId,
      joinedAt,
      totalScore: sum(own.map((answer) => answer.points)),
      correctResponseMs: sum(correct.map((answer) => answer.effectiveResponseMs)),
      correctAnswers: correct.length,
      averageResponseMs:
        own.length === 0
          ? null
          : Math.round(sum(own.map((a) => a.effectiveResponseMs)) / own.length),
      topics: topicOrder.map((topic) => ({
        topic,
        correct: correct.filter((answer) => questionTopics[answer.questionIndex] === topic).length,
        total: questionTopics.filter((candidate) => candidate === topic).length,
      })),
    };
  });

  return rankStandings(summaries, null).map((ranked) => {
    const summary = summaries.find(({ participantId }) => participantId === ranked.participantId);

    return {
      participantId: ranked.participantId,
      rank: ranked.rank,
      totalScore: ranked.totalScore,
      correctAnswers: summary?.correctAnswers ?? 0,
      questionCount: questionTopics.length,
      averageResponseMs: summary?.averageResponseMs ?? null,
      topics: summary?.topics ?? [],
    };
  });
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
