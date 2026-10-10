import { createDatabase, markRoomStarted, recordParticipant } from "@aptiquiz/database";
import type { RoomStore } from "./room-store.js";

export interface DatabaseRoomStore extends RoomStore {
  close(): Promise<void>;
}

export function createDatabaseRoomStore(databaseUrl: string): DatabaseRoomStore {
  const db = createDatabase(databaseUrl);

  return {
    recordParticipant: (input) => recordParticipant(db, input),
    markRoomStarted: (roomId) => markRoomStarted(db, roomId),
    close: () => db.$disconnect(),
  };
}
