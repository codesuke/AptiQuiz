import { listQuestionSets, seedStarterQuestionSet } from "@aptiquiz/database";
import { ArrowLeft, ArrowUpRight, Building2, Check } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { HOST_PATH, requireHostCollege } from "@/lib/host-college";
import { CreateRoomForm, type HostableQuestionSet } from "./create-room-form";
import { HostMotion } from "./host-motion";

export const dynamic = "force-dynamic";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ questionSetId?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const query = await searchParams;

  const initials = session.user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const decision = await requireHostCollege(database, session.user.id);
  if (!decision.ok) {
    const returnTo = query.questionSetId
      ? `${HOST_PATH}?questionSetId=${encodeURIComponent(query.questionSetId)}`
      : HOST_PATH;
    redirect(`/college?next=${encodeURIComponent(returnTo)}`);
  }

  await seedStarterQuestionSet(database);
  const sets = await listQuestionSets(database, session.user.id);
  const questionSets: HostableQuestionSet[] = sets.map((set) => ({
    id: set.id,
    title: set.title,
    questionCount: set.questions.length,
    isStarter: set.isStarter,
  }));

  return (
    <main className="relative min-h-screen max-w-full overflow-x-hidden bg-[#fdfbf7] text-[#132922]">
      <HostMotion />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-44 top-20 size-[34rem] rounded-full bg-[#f0dfc5] opacity-45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-16rem] top-[20rem] size-[35rem] rounded-full bg-[#d7e4da] opacity-55 blur-3xl"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-[4.75rem] h-px bg-[#e5e2dc]" />
      <div
        aria-hidden="true"
        className="absolute right-0 top-[4.75rem] hidden h-[45rem] w-[min(37vw,39rem)] bg-[linear-gradient(to_right,transparent_0,transparent_23px,#e8e5dc_24px),linear-gradient(to_bottom,transparent_0,transparent_23px,#e8e5dc_24px)] bg-[size:24px_24px] opacity-60 lg:block"
      />

      <header
        className="relative mx-auto flex min-h-[4.75rem] max-w-[1720px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-12"
        data-host-nav
      >
        <div className="flex min-w-0 items-center gap-4 sm:gap-7">
          <Link
            aria-label="AptiQuiz home"
            className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
            href="/"
          >
            <Image
              alt=""
              className="h-auto w-32 sm:w-36"
              height={724}
              src="/brand/aptiquiz-logo.png"
              width={2172}
            />
          </Link>
          <span aria-hidden="true" className="hidden h-8 w-px bg-[#d8d4cd] sm:block" />
          <span className="hidden whitespace-nowrap font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#5e6a63] lg:block">
            Practice today. Place tomorrow.
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-7">
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#24362f] transition-colors hover:text-[#b84700] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
          <span aria-hidden="true" className="hidden h-8 w-px bg-[#d8d4cd] sm:block" />
          <span
            aria-label={`Signed in as ${session.user.name}`}
            className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-[#e8e4da] text-sm font-semibold text-[#22342d] sm:flex"
            role="img"
          >
            {initials || "U"}
          </span>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1720px] items-start gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100vh-4.75rem)] lg:grid-cols-[minmax(0,0.95fr)_minmax(35rem,1.05fr)] lg:gap-12 lg:px-12 lg:py-5">
        <div
          className="relative max-w-2xl pb-10 pt-3 lg:min-h-[42rem] lg:pb-20 lg:pt-14"
          data-host-copy
        >
          <p className="relative z-10 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#627169]">
            <span aria-hidden="true" className="h-px w-9 bg-[#e65c00]" />
            Host a Room
          </p>
          <h1 className="relative z-10 mt-7 max-w-6xl text-balance font-[family-name:var(--aq-font-display)] text-[clamp(4rem,7vw,7.25rem)] font-normal leading-[0.98] tracking-[-0.06em] text-[#122a22]">
            Host your
            <br />
            next Room<span className="text-[#e65c00]">.</span>
          </h1>
          <p className="relative z-10 mt-7 max-w-lg text-pretty text-lg leading-8 text-[#526159] sm:text-xl">
            Choose a Question Set, create your live aptitude competition, and share its Join Code
            with your peers.
          </p>
          <div className="relative z-10 mt-10 border-l-2 border-[#e65c00] pl-5 font-mono text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-[#66736c]">
            Same campus. Bigger preparation.
            <br />
            Brighter placement prospects.
          </div>
          <Image
            alt=""
            className="pointer-events-none absolute -bottom-2 left-0 hidden h-auto w-[calc(100%+4rem)] max-w-none opacity-45 grayscale lg:block"
            data-host-artwork
            height={724}
            src="/images/college-campus-engraving.png"
            width={2172}
          />
          <p className="absolute bottom-0 left-0 hidden font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#77837c] lg:block">
            Students solve tomorrow.
          </p>
        </div>

        <section
          aria-labelledby="room-setup-title"
          className="relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#15372d] px-5 py-7 text-[#fdfbf7] shadow-[0_32px_80px_-36px_rgba(18,42,34,0.76)] sm:px-8 sm:py-8"
          data-host-panel
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,179,128,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 size-56 rounded-full border border-white/10"
          />
          <div className="relative">
            <div className="flex items-center justify-between gap-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#d0ddd5]">
              <span>Create Room</span>
              <span className="hidden sm:block">AptiQuiz</span>
            </div>
            <div className="mx-auto mt-4 flex max-w-xl flex-col items-center text-center">
              <div className="relative grid size-20 place-items-center rounded-full bg-[#ec6b12]">
                <Check aria-hidden="true" className="size-10 stroke-[3] text-white" />
              </div>
              <h2
                className="mt-3 text-balance font-[family-name:var(--aq-font-display)] text-3xl font-normal tracking-[-0.035em] sm:text-4xl"
                id="room-setup-title"
              >
                Create a live Room.
              </h2>
              <p className="mt-2 max-w-xl text-pretty leading-7 text-[#d0ddd5]">
                Select a Question Set to get started.
              </p>
            </div>

            <div className="mt-4 border-t border-white/20 pt-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fdfbf7] text-[#19352d]">
                    <Building2 aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#d0ddd5]">
                      Hosting for
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold tracking-[-0.02em]">
                      {decision.college.name}
                    </p>
                  </div>
                </div>
                <Link
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start font-semibold text-[#ffb380] transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffb380] sm:self-auto"
                  href="/college"
                >
                  Change College
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>

            {questionSets.length === 0 ? (
              <p className="mt-5 border border-dashed border-white/25 bg-black/10 p-5 leading-7 text-[#d0ddd5]">
                You have no Question Sets yet.{" "}
                <Link
                  className="font-semibold text-[#ffb380] underline decoration-[#ffb380]/60 underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffb380]"
                  href="/question-sets"
                >
                  Build a Question Set
                </Link>{" "}
                to host a Room.
              </p>
            ) : (
              <>
                <CreateRoomForm
                  questionSets={questionSets}
                  requestedQuestionSetId={query.questionSetId}
                />
                <p className="mt-6 text-sm text-[#d0ddd5]">
                  Need a different set?{" "}
                  <Link
                    className="font-semibold text-[#ffb380] underline decoration-[#ffb380]/60 underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffb380]"
                    href="/question-sets"
                  >
                    Manage Question Sets
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
