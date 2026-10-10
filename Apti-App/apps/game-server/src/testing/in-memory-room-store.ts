import type { ParticipantRecord, RoomStore } from "../room-store.js";

export interface InMemoryRoomStore extends RoomStore {
  readonly participants: readonly ParticipantRecord[];
  readonly startedRoomIds: readonly string[];
  readonly finishedRoomIds: readonly string[];
  /** Makes the next participant write reject, as a database outage would. */
  failNextParticipant(): void;
  /** Holds participant writes in flight until the returned release function runs. */
  holdParticipantWrites(): () => void;
}

export function createInMemoryRoomStore(): InMemoryRoomStore {
  const participants: ParticipantRecord[] = [];
  const startedRoomIds: string[] = [];
  const finishedRoomIds: string[] = [];
  let failNext = false;
  let writeGate: Promise<void> = Promise.resolve();

  return {
    participants,
    startedRoomIds,
    finishedRoomIds,
    failNextParticipant: () => {
      failNext = true;
    },
    holdParticipantWrites: () => {
      let release = () => {};
      writeGate = new Promise((resolve) => {
        release = resolve;
      });
      return release;
    },
    recordParticipant: async (input) => {
      const shouldFail = failNext;
      failNext = false;
      await writeGate;

      if (shouldFail) {
        throw new Error("participant write failed");
      }

      participants.push(input);
      return { participantId: `participant_${participants.length}` };
    },
    markRoomStarted: async (roomId) => {
      startedRoomIds.push(roomId);
    },
    markRoomFinished: async (roomId) => {
      finishedRoomIds.push(roomId);
    },
  };
}
