"use client";

import { useLiveSoundCues } from "@/components/round/live-sound-provider";
import { HostRoomView } from "./host-room-view";
import { useJoinLink } from "./join-qr";
import { useHostRoom } from "./use-host-room";

interface HostLobbyProps {
  readonly roomId: string;
  readonly joinCode: string;
  readonly collegeName: string;
  readonly questionSetTitle: string;
  readonly registrationFailed: boolean;
}

/** Connects the Host to the live Room and renders it for the current phase. */
export function HostLobby({
  roomId,
  joinCode,
  collegeName,
  questionSetTitle,
  registrationFailed,
}: HostLobbyProps) {
  const { lobby, lobbyReceivedAt, round, connection, roomError, start, startMatch } =
    useHostRoom(roomId);
  const joinLink = useJoinLink(joinCode);
  useLiveSoundCues(lobby, round, lobbyReceivedAt);

  return (
    <HostRoomView
      collegeName={collegeName}
      connection={connection}
      joinCode={joinCode}
      joinLink={joinLink}
      lobby={lobby}
      lobbyReceivedAt={lobbyReceivedAt}
      onStart={startMatch}
      questionSetTitle={questionSetTitle}
      registrationFailed={registrationFailed}
      roomError={roomError}
      round={round}
      start={start}
    />
  );
}
