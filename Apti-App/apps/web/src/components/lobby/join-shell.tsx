import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface JoinShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly children: ReactNode;
}

/** Page frame shared by the join and Lobby screens. */
export function JoinShell({ eyebrow, title, intro, children }: JoinShellProps) {
  return (
    <main className="relative min-h-screen bg-[#fdfbf7] px-5 pb-16 text-[#1d2925] sm:px-8">
      <div aria-hidden="true" className="absolute inset-x-0 top-[4.75rem] h-px bg-[#deded4]" />

      <header className="relative mx-auto flex min-h-[4.75rem] max-w-5xl items-center justify-between gap-4">
        <Link
          aria-label="AptiQuiz home"
          className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
          href="/"
        >
          <Image
            alt=""
            className="h-auto w-28 sm:w-36"
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

      <div className="relative mx-auto max-w-5xl pt-10 sm:pt-14">
        <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#627169]">
          <span aria-hidden="true" className="h-px w-9 bg-[#e65c00]" />
          {eyebrow}
        </p>
        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1] tracking-[-0.05em] text-[#172823] sm:text-5xl">
          {title}
          <span className="text-[#e65c00]">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-lg leading-7 text-[#526159]">{intro}</p>
        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </main>
  );
}
