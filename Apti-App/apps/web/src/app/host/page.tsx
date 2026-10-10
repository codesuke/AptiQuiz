import { listQuestionSets, seedStarterQuestionSet } from "@aptiquiz/database";
import { ArrowLeft, ArrowUpRight, Building2 } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { HOST_PATH, requireHostCollege } from "@/lib/host-college";
import { CreateRoomForm, type HostableQuestionSet } from "./create-room-form";

export const dynamic = "force-dynamic";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ questionSetId?: string }>;
}) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");
  const query = await searchParams;

  const decision = await requireHostCollege(database, session.user.id);
  if (!decision.ok) {
    const returnTo = query.questionSetId
      ? `${HOST_PATH}?questionSetId=${encodeURIComponent(query.questionSetId)}`
      : HOST_PATH;
    redirect(`/college?next=${encodeURIComponent(returnTo)}`);
  }

  await seedStarterQuestionSet(database);
  const questionSets: HostableQuestionSet[] = (
    await listQuestionSets(database, session.user.id)
  ).map((set) => ({
    id: set.id,
    title: set.title,
    questionCount: set.questions.length,
    isStarter: set.isStarter,
  }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fdfbf7] px-5 text-[#1d2925] sm:px-8">
      <div aria-hidden="true" className="absolute inset-x-0 top-[4.75rem] h-px bg-[#deded4]" />
      <div
        aria-hidden="true"
        className="absolute right-0 top-[4.75rem] hidden h-[38rem] w-[min(39vw,36rem)] bg-[linear-gradient(to_right,transparent_0,transparent_23px,#e8e5dc_24px),linear-gradient(to_bottom,transparent_0,transparent_23px,#e8e5dc_24px)] bg-[size:24px_24px] opacity-60 lg:block"
      />

      <header className="relative mx-auto flex min-h-[4.75rem] max-w-7xl items-center justify-between gap-4">
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
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#38463f] transition-colors hover:text-[#b84700] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to home
        </Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-start gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] lg:gap-16 lg:py-16">
        <div className="max-w-xl pt-3 lg:sticky lg:top-12">
          <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#627169]">
            <span aria-hidden="true" className="h-px w-9 bg-[#e65c00]" />
            Host a Room
          </p>
          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-[#172823] sm:text-6xl lg:text-7xl">
            Bring your next Room to life<span className="text-[#e65c00]">.</span>
          </h1>
          <p className="mt-7 max-w-lg text-pretty text-lg leading-8 text-[#526159] sm:text-xl">
            Choose a Question Set, create your live aptitude competition, and share its Join Code
            with your peers.
          </p>
          <div className="mt-10 border-l-2 border-[#e65c00] pl-5 font-mono text-xs font-semibold uppercase leading-6 tracking-[0.2em] text-[#66736c]">
            One College. One Room.
            <br />
            Practice under pressure.
          </div>
        </div>

        <section
          aria-labelledby="room-setup-title"
          className="relative overflow-hidden rounded-2xl bg-[#19352d] px-5 py-6 text-[#fdfbf7] shadow-[0_28px_60px_-32px_rgba(18,42,34,0.72)] sm:px-8 sm:py-9"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,179,128,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]"
          />
          <div className="relative">
            <div className="flex items-center justify-between gap-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#d0ddd5]">
              <span>Room setup</span>
              <span className="hidden sm:block">AptiQuiz</span>
            </div>
            <h2
              className="mt-8 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
              id="room-setup-title"
            >
              Create a live Room.
            </h2>
            <p className="mt-3 max-w-xl text-pretty leading-7 text-[#d0ddd5]">
              Pick the Question Set you want to run. We’ll keep its Questions exactly as they are
              when your Room opens.
            </p>

            <div className="mt-8 rounded-xl border border-white/15 bg-white/[0.07] p-5 sm:p-6">
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
              <p className="mt-6 rounded-xl border border-dashed border-white/25 bg-black/10 p-5 leading-7 text-[#d0ddd5]">
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
