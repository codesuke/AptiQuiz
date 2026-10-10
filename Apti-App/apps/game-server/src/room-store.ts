export interface ParticipantRecord {
  readonly roomId: string;
  readonly collegeId: string;
  readonly userId: string | null;
  readonly displayName: string;
  readonly idempotencyKey: string;
}

/** Persistence port for live Room changes; the Game Server stays authoritative for live state. */
export interface RoomStore {
  recordParticipant(input: ParticipantRecord): Promise<{ readonly participantId: string }>;
  markRoomStarted(roomId: string): Promise<void>;
}
