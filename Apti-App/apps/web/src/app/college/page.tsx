import { ArrowLeft, ArrowRight } from "lucide-react";
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
  return (
    <main className="min-h-screen bg-[#fdfbf7] px-5 pb-16 text-[#111827] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex min-h-20 flex-wrap items-center gap-x-8 gap-y-2 border-b border-[#e6e2d9] py-4">
          <Link
            aria-label="AptiQuiz home"
            className="inline-flex rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
            href="/"
          >
            <Image
              alt=""
              className="h-auto w-36 sm:w-40"
              height={724}
              src="/brand/aptiquiz-logo.png"
              width={2172}
            />
          </Link>
          <span aria-hidden="true" className="hidden h-7 w-px bg-[#ded9ce] sm:block" />
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#344039] transition-colors hover:text-[#b84700] focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#b84700]"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
        </header>

        <section className="relative pt-12 sm:pt-16 lg:pt-20" aria-labelledby="college-title">
          <div className="max-w-4xl">
            <p className="mb-5 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b5b3c]">
              <span aria-hidden="true" className="h-0.5 w-8 bg-[#e65c00]" />
              Home College
            </p>
            <h1
              id="college-title"
              className="max-w-4xl text-[clamp(3rem,6.5vw,6.5rem)] font-semibold leading-[1.02] tracking-[-0.065em]"
            >
              Represent your College.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#59616e] sm:text-xl">
              Choose the College you represent. Your Rooms and College League results use it.
            </p>
          </div>

          <aside className="absolute right-0 top-20 hidden w-36 border-l border-[#e6e2d9] pl-5 xl:block">
            <p className="text-5xl font-semibold tracking-tight text-[#e65c00]">01</p>
            <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78716c]">
              Your College
            </p>
            <p className="mt-7 text-sm leading-relaxed text-[#59616e]">
              Choose once. Change it here anytime.
            </p>
          </aside>

          <div className="relative mx-auto mt-12 max-w-5xl sm:mt-16 lg:mt-20">
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -left-5 top-8 hidden w-2/5 rounded-[2rem] bg-[#e65c00] sm:block"
            />
            <div className="relative rounded-[1.5rem] border border-[#e6e2d9] bg-white p-5 shadow-[0_20px_60px_rgba(27,31,35,0.07)] sm:p-8 lg:p-10">
              <HomeCollegePicker current={current} returnTo={returnTo} />
              {current && returnTo ? (
                <Link
                  className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#b84700] px-5 text-base font-semibold text-white transition-colors hover:bg-[#993a00] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
                  href={returnTo}
                >
                  Continue to hosting
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              ) : null}
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-5xl font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8278]">
            AptiQuiz / College League
          </p>
        </section>
      </div>
    </main>
  );
}
