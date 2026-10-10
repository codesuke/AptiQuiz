import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface JoinShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly children: ReactNode;
  readonly split?: boolean;
}

/** Page frame shared by the join and Lobby screens. */
export function JoinShell({ eyebrow, title, intro, children, split = false }: JoinShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--aq-canvas)] px-5 pb-16 text-[var(--aq-ink)] sm:px-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[4.75rem] h-px bg-[var(--aq-rule)]"
      />

      <header className="relative mx-auto flex min-h-[4.75rem] max-w-[1510px] items-center justify-between gap-4">
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

      <div
        className={`relative mx-auto max-w-[1510px] pt-10 sm:pt-14 ${split ? "grid gap-7 lg:min-h-[calc(100vh-4.75rem)] lg:grid-cols-[minmax(0,1fr)_minmax(27rem,0.85fr)] lg:items-center lg:gap-14 lg:pt-0" : ""}`}
      >
        <div className={split ? "relative lg:min-h-[40rem] lg:pt-20" : ""}>
          <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#627169]">
            <span aria-hidden="true" className="h-px w-9 bg-[#e65c00]" />
            {eyebrow}
          </p>
          <h1
            className={`mt-5 text-balance font-[family-name:var(--aq-font-display)] font-normal leading-[0.98] tracking-[-0.055em] text-[var(--aq-ink)] ${split ? "text-[clamp(4.2rem,7vw,7.8rem)]" : "text-[clamp(3.2rem,5vw,5.5rem)]"}`}
          >
            {title}
            <span className="text-[#e65c00]">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-lg leading-7 text-[#526159]">{intro}</p>
          {split ? (
            <Image
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 hidden h-auto w-full opacity-30 grayscale lg:block"
              height={724}
              src="/images/college-campus-engraving.png"
              width={2172}
            />
          ) : null}
        </div>
        <div className={split ? "relative pb-10 lg:pb-0" : "mt-8 sm:mt-10"}>{children}</div>
      </div>
    </main>
  );
}
