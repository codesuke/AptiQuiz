import type { ParticipantRecord } from "@aptiquiz/database";

export type { ParticipantRecord };

/** Persistence port for live Room changes; the Game Server stays authoritative for live state. */
export interface RoomStore {
  recordParticipant(input: ParticipantRecord): Promise<{ readonly participantId: string }>;
  markRoomStarted(roomId: string): Promise<void>;
  markRoomFinished(roomId: string): Promise<void>;
}
