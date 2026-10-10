import "server-only";
import type { CreateRoomRequest } from "@aptiquiz/contracts";
import {
  createRoom,
  EmptyQuestionSetError,
  getHostedRoom,
  type HostedRoom,
  QuestionSetNotFoundError,
} from "@aptiquiz/database";
import { database } from "./database";
import type { CreatedRoom } from "./rooms-handler";

export async function createHostedRoom(
  hostId: string,
  request: CreateRoomRequest,
  collegeId: string,
): Promise<CreatedRoom> {
  try {
    return { kind: "created", room: await createRoom(database, hostId, request, collegeId) };
  } catch (error) {
    if (error instanceof QuestionSetNotFoundError) return { kind: "question_set_not_found" };
    if (error instanceof EmptyQuestionSetError) return { kind: "question_set_empty" };
    throw error;
  }
}

export function findHostedRoom(hostId: string, roomId: string): Promise<HostedRoom | null> {
  return getHostedRoom(database, hostId, roomId);
}
