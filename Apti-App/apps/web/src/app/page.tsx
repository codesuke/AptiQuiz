import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/account-menu";
import { EmailVerificationNotice } from "@/components/auth/verification-resend";
import { GameServerStatus } from "@/components/game-server-status";
import { HomeScreen } from "@/components/home-screen";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { needsEmailVerification } from "@/lib/email-verification";
import { getHomeCollege } from "@/lib/home-college";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getActiveSession(await headers());
  const homeCollege = session ? await getHomeCollege(database, session.user.id) : null;

  return (
    <main className="min-h-screen bg-[#fdfbf7] px-5 text-[#1d2522] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#deded4] py-5">
          <Link
            aria-label="AptiQuiz home"
            className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
            href="/"
          >
            <Image
              alt=""
              className="h-auto w-36 sm:w-40"
              height={724}
              preload
              src="/brand/aptiquiz-logo.png"
              width={2172}
            />
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[#344039] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
              href="/question-sets"
            >
              Question Sets
            </Link>
            <AccountMenu
              collegeName={homeCollege?.name ?? null}
              name={session?.user.name ?? null}
            />
          </div>
        </header>
        {needsEmailVerification(session) ? (
          <EmailVerificationNotice email={session.user.email} />
        ) : null}
        <HomeScreen signedIn={Boolean(session)} />
        <div className="border-t border-[#deded4] py-5">
          <details className="text-sm text-[#58645c]">
            <summary className="w-fit cursor-pointer font-medium hover:text-[#1d2522] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]">
              Connection details
            </summary>
            <div className="mt-3">
              <GameServerStatus />
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}
