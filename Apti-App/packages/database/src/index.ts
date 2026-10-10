import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function createDatabase(connectionString: string): PrismaClient {
  if (connectionString.length === 0) {
    throw new Error("A PostgreSQL connection string is required");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export {
  type CollegeLeague,
  type CollegeStanding,
  getCollegeLeague,
  LEAGUE_TABLE_SIZE,
  type LeaguePeriod,
  leaguePeriodAt,
  type ParticipantStanding,
} from "./college-league.js";
export { APPROVED_COLLEGES, collegeIdFor, normalizeCollegeName, seedColleges } from "./colleges.js";
export type { PrismaClient } from "./generated/prisma/client.js";
export { Prisma } from "./generated/prisma/client.js";
export {
  type CommittedMatchResult,
  type CompleteRoomInput,
  completeRoom,
  type MatchResultInput,
  RoomCompletionError,
  type TopicStat,
} from "./match-results.js";
export {
  addQuestion,
  createQuestionSet,
  createQuestionSetSchema,
  getQuestionSet,
  listQuestionSets,
  QUESTION_OPTION_NUMBERS,
  QuestionSetNotFoundError,
  questionInputSchema,
  questionMediaSchema,
  questionOptionsSchema,
  reorderQuestions,
  seedStarterQuestionSet,
  snapshotQuestionSet,
  updateQuestion,
} from "./question-sets.js";
export {
  createRoom,
  EmptyQuestionSetError,
  getHostedRoom,
  type HostedRoom,
  markRoomFinished,
  markRoomStarted,
  type ParticipantRecord,
  randomJoinCode,
  recordParticipant,
} from "./rooms.js";
