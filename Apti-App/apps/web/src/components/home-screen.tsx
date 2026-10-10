import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getHomeDestinations } from "./home-destinations";

export function HomeScreen({ signedIn }: Readonly<{ signedIn: boolean }>) {
  const destinations = getHomeDestinations(signedIn);

  return (
    <div className="mx-auto w-full max-w-6xl pb-12 pt-10 sm:pt-14">
      <div className="max-w-3xl">
        <h1 className="text-balance text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1d2522] sm:text-[3.7rem]">
          Start with a Question Set.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-8 text-[#45514a]">
          Create and edit the Questions you’ll use when live Rooms open.
        </p>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] lg:gap-12">
        <section
          aria-labelledby="question-sets-title"
          className="relative flex min-h-[315px] flex-col justify-between overflow-hidden rounded-2xl bg-[#1d2925] p-7 text-[#fdfbf7] sm:p-9"
        >
          <div className="relative z-10">
            <h2
              className="max-w-lg text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl"
              id="question-sets-title"
            >
              Build your next Question Set
            </h2>
            <p className="mt-4 max-w-md leading-7 text-[#d2dfd5]">
              Add Questions from scratch, or open the starter set to see how one is structured.
            </p>
          </div>
          <div className="relative z-10 mt-9">
            <Link
              className="inline-flex min-h-12 items-center gap-3 rounded-lg bg-[#fdfbf7] px-5 font-semibold text-[#1d2925] transition-colors hover:bg-[#f7dfcf] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdfbf7]"
              href={destinations.questionSets}
            >
              {signedIn ? "Open Question Sets" : "Sign in to build a Question Set"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full border-[38px] border-[#344d3c] opacity-70 sm:size-80"
          />
        </section>

        <div className="divide-y divide-[#d8d9cf] border-y border-[#d8d9cf]">
          <section aria-labelledby="hosting-title" className="py-7 first:pt-2 lg:first:pt-6">
            <h2
              className="text-2xl font-semibold tracking-[-0.025em] text-[#1d2522]"
              id="hosting-title"
            >
              Set up hosting
            </h2>
            <p className="mt-3 leading-7 text-[#45514a]">
              Choose your Home College and see where your future Room will belong.
            </p>
            <p className="mt-3 text-sm font-medium text-[#724b30]">Room creation is coming soon.</p>
            <Link
              className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-[#9b4209] underline decoration-[#d5a786] underline-offset-4 hover:text-[#6e2e05] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9b4209]"
              href={destinations.hosting}
            >
              Open hosting setup <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </section>
          <section aria-labelledby="joining-title" className="py-7">
            <h2 className="text-xl font-semibold text-[#1d2522]" id="joining-title">
              Join a Room
            </h2>
            <p className="mt-3 leading-7 text-[#45514a]">
              Joining a Room is coming soon. You’ll enter a Join Code here when it opens.
            </p>
          </section>
        </div>
      </div>

      <div className="mt-10 border-t border-[#deded4] pt-6 text-sm text-[#58645c]">
        AptiQuiz helps students prepare for placements through shared aptitude practice.
      </div>
    </div>
  );
}
