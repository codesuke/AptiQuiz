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
    <main className="min-h-screen bg-[#fdfbf7] text-[#15372d]">
      <div className="relative z-10 border-b border-[#d6d8cf] bg-[#fdfbf7]">
        <header className="mx-auto flex min-h-[82px] max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
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
              sizes="160px"
              src="/brand/aptiquiz-logo.png"
              width={2172}
            />
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex w-full min-w-0 flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-7 xl:w-auto xl:justify-end"
          >
            <Link
              className="inline-flex min-h-11 items-center font-[Georgia] text-base text-[#15372d] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
              href="/question-sets"
            >
              Question Sets
            </Link>
            <Link
              className="hidden min-h-11 items-center font-[Georgia] text-base text-[#15372d] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700] sm:inline-flex"
              href="#how-it-works"
            >
              How it works
            </Link>
            <AccountMenu
              collegeName={homeCollege?.name ?? null}
              name={session?.user.name ?? null}
            />
          </nav>
        </header>
      </div>
      {needsEmailVerification(session) ? (
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <EmailVerificationNotice email={session.user.email} />
        </div>
      ) : null}
      <HomeScreen signedIn={Boolean(session)} />
      <div className="bg-[#123b2e] px-5 text-[#d2dfd5] sm:px-8">
        <div className="mx-auto max-w-[1420px] border-t border-white/20 py-5">
          <details className="text-sm text-[#58645c]">
            <summary className="w-fit cursor-pointer font-medium hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffb380]">
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
