import "server-only";
import type { CreateRoomRequest } from "@aptiquiz/contracts";
import { createRoom, getHostedRoom, QuestionSetNotFoundError } from "@aptiquiz/database";
import { database } from "./database";
import type { HostedRoom } from "./rooms-handler";

export async function createHostedRoom(
  hostId: string,
  request: CreateRoomRequest,
  collegeId: string,
): Promise<HostedRoom | null> {
  try {
    return await createRoom(database, hostId, request, collegeId);
  } catch (error) {
    if (error instanceof QuestionSetNotFoundError) return null;
    throw error;
  }
}

export function findHostedRoom(hostId: string, roomId: string): Promise<HostedRoom | null> {
  return getHostedRoom(database, hostId, roomId);
}
