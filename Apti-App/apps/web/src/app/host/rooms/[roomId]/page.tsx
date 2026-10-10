import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HostLobby } from "@/components/host-lobby/host-lobby";
import { getActiveSession } from "@/lib/auth";
import { registerRoom } from "@/lib/game-server-registration";
import { findHostedRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export default async function HostRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const { roomId } = await params;
  const room = await findHostedRoom(session.user.id, roomId);
  if (!room) notFound();

  // Registration is idempotent; repeating it restores a Lobby lost to a Game Server restart.
  const registrationFailed =
    room.status === "LOBBY" ? !(await registerRoom(room.registration)).ok : false;

  return (
    <main className="min-h-screen bg-[#efece5] px-4 py-8 text-stone-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-medium text-[#b84700] underline underline-offset-4"
          href="/host"
        >
          Back to hosting
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your Room</h1>
        <p className="mt-1 text-stone-600">
          {room.registration.questionSetTitle} · {room.registration.college.name}
        </p>
        <div className="mt-6">
          <HostLobby
            collegeName={room.registration.college.name}
            joinCode={room.joinCode}
            registrationFailed={registrationFailed}
            roomId={room.roomId}
          />
        </div>
      </div>
    </main>
  );
}
