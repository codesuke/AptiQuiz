import { BarChart3, Trophy, UsersRound } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeCollegePicker } from "@/components/home-college-picker";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { getHomeCollege } from "@/lib/home-college";
import { resolveHostReturnTarget } from "@/lib/host-college";

export const dynamic = "force-dynamic";

export default async function CollegePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const current = await getHomeCollege(database, session.user.id);
  const returnTo = resolveHostReturnTarget((await searchParams).next);
  const initials = session.user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <main className="min-h-screen overflow-hidden bg-[#fdfbf7] text-[#0c1025]">
      <header className="border-b border-[#e5e2dc]">
        <div className="mx-auto flex min-h-[82px] max-w-[1720px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-12">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link
              aria-label="AptiQuiz home"
              className="inline-flex rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
              href="/"
            >
              <Image
                alt=""
                className="h-auto w-36 sm:w-44"
                height={724}
                priority
                src="/brand/aptiquiz-logo.png"
                width={2172}
              />
            </Link>
            <span aria-hidden="true" className="h-7 w-px bg-[#d8d4cd]" />
            <span className="whitespace-nowrap text-sm text-[#687080] sm:text-lg">for College</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-8">
            <span className="hidden text-sm text-[#707783] lg:block">
              Brighter Minds. A More Curious Tomorrow.
            </span>
            <span aria-hidden="true" className="hidden h-7 w-px bg-[#d8d4cd] sm:block" />
            <span
              aria-label={`Signed in as ${session.user.name}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f0efed] text-sm font-semibold text-[#424959]"
              role="img"
            >
              {initials || "U"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1720px] gap-10 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.05fr)_minmax(0,0.57fr)] xl:gap-9 xl:px-12 xl:pt-16">
        <section className="relative min-w-0 lg:min-h-[710px]" aria-labelledby="college-title">
          <div className="relative z-10">
            <p className="mb-5 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.26em] text-[#161a2b]">
              <span aria-hidden="true" className="h-px w-12 bg-[#e65c00]" />
              College League
            </p>
            <h1
              id="college-title"
              className="font-serif text-[clamp(3.6rem,4.85vw,5.8rem)] font-bold leading-[0.98] tracking-[-0.065em]"
            >
              Represent
              <br />
              your College.
            </h1>
            <p className="mt-7 max-w-[470px] text-lg leading-[1.5] text-[#677083] sm:text-xl">
              Choose the College you represent. Your Rooms and College League results use it.
            </p>
            <div className="mt-16 hidden items-center gap-6 text-[#111827] 2xl:flex">
              <div className="flex items-center gap-2">
                <Trophy aria-hidden="true" className="size-6 text-[#e65c00]" />
                <span className="text-sm font-semibold">Compete</span>
              </div>
              <span aria-hidden="true" className="h-7 w-px bg-[#dedbd4]" />
              <div className="flex items-center gap-2">
                <UsersRound aria-hidden="true" className="size-6 text-[#e65c00]" />
                <span className="text-sm font-semibold">Represent</span>
              </div>
              <span aria-hidden="true" className="h-7 w-px bg-[#dedbd4]" />
              <div className="flex items-center gap-2">
                <BarChart3 aria-hidden="true" className="size-6 text-[#e65c00]" />
                <span className="text-sm font-semibold">Improve</span>
              </div>
            </div>
          </div>
          <Image
            alt=""
            className="pointer-events-none absolute -bottom-2 -left-10 hidden h-auto w-[calc(100%+80px)] max-w-none opacity-75 lg:block"
            height={724}
            loading="eager"
            src="/images/college-campus-engraving.png"
            width={2172}
          />
          <p className="relative z-10 mt-14 hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-[#777f8e] lg:absolute lg:-bottom-10 lg:left-0 lg:block">
            Colleges today. A brighter tomorrow.
          </p>
        </section>

        <section aria-label="Choose your Home College" className="min-w-0">
          <HomeCollegePicker current={current} returnTo={returnTo} />
        </section>

        <aside className="min-w-0 border-t border-[#e2dfd9] pt-8 xl:border-l xl:border-t-0 xl:pl-9 xl:pt-1">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#161a2b]">
            <UsersRound aria-hidden="true" className="size-5 text-[#b84700]" />A note about Rooms
          </p>
          <h2 className="mt-9 font-serif text-3xl font-bold leading-[1.1] tracking-[-0.045em] xl:text-[2.15rem]">
            One College.
            <br />
            Every Room.
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-[#677083]">
            Your Home College is the College you represent. You can change it here.
          </p>
          <div className="mt-16 space-y-8 border-b border-[#e2dfd9] pb-11 text-sm">
            <div className="flex gap-4">
              <Trophy aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b84700]" />
              <div>
                <p className="font-semibold">Host under your College</p>
                <p className="mt-1 leading-relaxed text-[#71798a]">
                  Your Rooms use your Home College.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <UsersRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b84700]" />
              <div>
                <p className="font-semibold">Represent yours</p>
                <p className="mt-1 leading-relaxed text-[#71798a]">
                  One College for your signed-in account.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <BarChart3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b84700]" />
              <div>
                <p className="font-semibold">Change when needed</p>
                <p className="mt-1 leading-relaxed text-[#71798a]">
                  Search and choose another College here.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-9 font-serif text-lg italic leading-relaxed text-[#707783]">
            Your people. Your place to play.
          </p>
        </aside>
      </div>
    </main>
  );
}
