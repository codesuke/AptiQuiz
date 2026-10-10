import type {
  CommittedMatchResult,
  CompleteRoomInput,
  ParticipantRecord,
  RoomStore,
} from "../room-store.js";

export interface InMemoryRoomStore extends RoomStore {
  readonly participants: readonly ParticipantRecord[];
  readonly startedRoomIds: readonly string[];
  readonly finishedRoomIds: readonly string[];
  /** Every completion the Game Server committed, in order. */
  readonly completions: readonly CompleteRoomInput[];
  /** Makes the next Room completion reject, as a failed transaction would. */
  failNextCompletion(): void;
  /** Makes the next participant write reject, as a database outage would. */
  failNextParticipant(): void;
  /** Holds participant writes in flight until the returned release function runs. */
  holdParticipantWrites(): () => void;
}

export function createInMemoryRoomStore(): InMemoryRoomStore {
  const participants: ParticipantRecord[] = [];
  const startedRoomIds: string[] = [];
  const finishedRoomIds: string[] = [];
  const completions: CompleteRoomInput[] = [];
  let failNext = false;
  let failNextCompletion = false;
  let writeGate: Promise<void> = Promise.resolve();

  return {
    participants,
    startedRoomIds,
    finishedRoomIds,
    completions,
    failNextCompletion: () => {
      failNextCompletion = true;
    },
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
      return { participantId: input.id };
    },
    markRoomStarted: async (roomId) => {
      startedRoomIds.push(roomId);
    },
    completeRoom: async (input) => {
      if (failNextCompletion) {
        failNextCompletion = false;
        throw new Error("completion failed");
      }

      completions.push(input);
      finishedRoomIds.push(input.roomId);
      return input.results.map(
        (result): CommittedMatchResult => ({
          ...result,
          collegeId: "college_room",
          userId: null,
          emailVerifiedAtCompletion: false,
          completedAt: input.completedAt,
        }),
      );
    },
  };
}
