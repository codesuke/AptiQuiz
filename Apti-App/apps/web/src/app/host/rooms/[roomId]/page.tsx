import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
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
    <main className="min-h-screen bg-[var(--aq-canvas)] text-[var(--aq-ink)]">
      <header className="border-b border-[var(--aq-rule)]">
        <div className="mx-auto flex min-h-20 max-w-[1510px] items-center justify-between gap-4 px-5 sm:px-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link
              aria-label="AptiQuiz home"
              className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aq-action)]"
              href="/"
            >
              <Image
                alt=""
                className="h-auto w-32 sm:w-40"
                height={724}
                src="/brand/aptiquiz-logo.png"
                width={2172}
              />
            </Link>
            <span aria-hidden="true" className="hidden h-8 w-px bg-[var(--aq-rule)] sm:block" />
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:text-[var(--aq-action)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aq-action)]"
              href="/host"
            >
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to hosting
            </Link>
          </div>
          <span className="hidden font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aq-text-muted)] sm:block">
            Host Room
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1510px] px-5 pb-16 pt-9 sm:px-10 sm:pt-12">
        <HostLobby
          collegeName={room.registration.college.name}
          joinCode={room.joinCode}
          questionSetTitle={room.registration.questionSetTitle}
          registrationFailed={registrationFailed}
          roomId={room.roomId}
        />
      </div>
    </main>
  );
}
