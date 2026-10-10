import { displayNameSchema, roomCodeSchema } from "@aptiquiz/contracts";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { JoinRoom } from "@/components/lobby/join-room";
import { JoinShell } from "@/components/lobby/join-shell";
import { getActiveSession } from "@/lib/auth";
import { joinFailureMessage } from "@/lib/room-errors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join Room · AptiQuiz" };

interface JoinRoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinRoomPage({ params }: JoinRoomPageProps) {
  const { code } = await params;
  const joinCode = roomCodeSchema.safeParse(code);

  if (!joinCode.success) {
    return (
      <JoinShell
        eyebrow="Join a Room"
        intro={joinFailureMessage("invalid_join_code")}
        title="That link doesn't look right"
      >
        <Link
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#b84700] transition-colors hover:text-[#993a00] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
          href="/join"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Enter a Join Code
        </Link>
      </JoinShell>
    );
  }

  return (
    <JoinShell
      eyebrow="Join a Room"
      intro="Pick the name other players will see. Guests play without an account."
      title="Join the Lobby"
    >
      <JoinRoom defaultDisplayName={await signedInDisplayName()} joinCode={joinCode.data} />
    </JoinShell>
  );
}

/** Prefills the form for a signed-in User whose account name is a valid display name. */
async function signedInDisplayName(): Promise<string> {
  const session = await getActiveSession(await headers());
  const name = displayNameSchema.safeParse(session?.user.name ?? "");
  return name.success ? name.data : "";
}
