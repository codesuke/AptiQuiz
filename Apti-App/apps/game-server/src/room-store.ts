import type {
  CommittedMatchResult,
  CompleteRoomInput,
  ParticipantRecord,
} from "@aptiquiz/database";

export type { CommittedMatchResult, CompleteRoomInput, ParticipantRecord };

/** Persistence port for live Room changes; the Game Server stays authoritative for live state. */
export interface RoomStore {
  recordParticipant(input: ParticipantRecord): Promise<{ readonly participantId: string }>;
  markRoomStarted(roomId: string): Promise<void>;
  /**
   * Saves every MatchResult and the Room's completion in one transaction. It is idempotent: a
   * repeat returns the first committed results. A rejection leaves the Room unfinished.
   */
  completeRoom(input: CompleteRoomInput): Promise<readonly CommittedMatchResult[]>;
}
