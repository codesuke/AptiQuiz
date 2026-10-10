import { ArrowRight, Gauge, ShieldCheck, Users } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import { AccountMenu } from "@/components/auth/account-menu";
import { GameServerStatus } from "@/components/game-server-status";
import { getActiveSession } from "@/lib/auth";

const foundations = [
  {
    icon: Gauge,
    title: "Server-authoritative",
    copy: "The game server owns every deadline, accepted answer, and score.",
  },
  {
    icon: Users,
    title: "Fifty-player proof",
    copy: "A TypeScript simulator exercises fifty independent socket connections.",
  },
  {
    icon: ShieldCheck,
    title: "Scale without a rewrite",
    copy: "Shared contracts and a pure game engine keep transport and rules separate.",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getActiveSession(await headers());
  return (
    <main className="min-h-screen overflow-hidden bg-[#efece5] text-stone-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(230,92,0,0.15),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(255,179,128,0.24),transparent_30%)]" />
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <Image
              alt="AptiQuiz"
              className="h-auto w-36 sm:w-48"
              height={724}
              preload
              src="/brand/aptiquiz-logo.png"
              width={2172}
            />
            <p className="mt-1 hidden text-xs text-stone-500 sm:block">
              Placement pressure, made playable.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GameServerStatus />
            <AccountMenu name={session?.user.name ?? null} />
          </div>
        </header>

        <div className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-[#e65c00]">
              Foundation online
            </p>
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              Race the clock. Climb the room.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-stone-600">
              Aptitude practice becomes a synchronized multiplayer match—with fair server timing,
              instant standings, and college-wide competition.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#e65c00] px-5 py-3 font-semibold text-white shadow-[0_4px_14px_rgba(230,92,0,0.24)] transition hover:bg-[#cc5200] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
                type="button"
              >
                Join a room
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
              <button
                className="rounded-xl border border-stone-300 bg-white/50 px-5 py-3 font-semibold text-stone-800 transition hover:bg-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-500"
                type="button"
              >
                Host a match
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {foundations.map(({ icon: Icon, title, copy }, index) => (
              <article
                className="rounded-2xl border border-stone-200/80 bg-[#fdfbf7]/90 p-5 shadow-[0_8px_30px_rgba(87,63,42,0.06)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(87,63,42,0.09)]"
                key={title}
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff5e6] text-[#e65c00] ring-1 ring-[#e65c00]/10">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-stone-400">0{index + 1}</p>
                    <h2 className="mt-1 font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{copy}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-300/70 pt-5 text-xs text-stone-500">
          <span>Next.js · Socket.IO · PostgreSQL</span>
          <span>Kafka intentionally deferred.</span>
        </footer>
      </section>
    </main>
  );
}
