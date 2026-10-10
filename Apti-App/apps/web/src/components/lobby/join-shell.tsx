import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { JoinMotion } from "./join-motion";

interface JoinShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly children: ReactNode;
  readonly split?: boolean;
  readonly joined?: boolean;
  readonly headingAside?: ReactNode;
}

/** Page frame shared by the join and Lobby screens. */
export function JoinShell({
  eyebrow,
  title,
  intro,
  children,
  split = false,
  joined = false,
  headingAside,
}: JoinShellProps) {
  return (
    <main className="relative min-h-screen max-w-full overflow-x-hidden bg-[var(--aq-canvas)] px-5 pb-16 text-[var(--aq-ink)] sm:px-10">
      <JoinMotion />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-24 size-[32rem] rounded-full bg-[#f0dfc5] opacity-45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-17rem] top-[22rem] size-[34rem] rounded-full bg-[#d7e4da] opacity-65 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[4.75rem] h-px bg-[var(--aq-rule)]"
      />

      <header
        className="relative mx-auto flex min-h-[4.75rem] max-w-[1510px] items-center justify-between gap-4"
        data-join-nav
      >
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
        className={`relative mx-auto max-w-[1510px] ${joined ? "pt-5 sm:pt-6" : "pt-10 sm:pt-14"} ${split ? "grid gap-7 lg:min-h-[calc(100vh-4.75rem)] lg:grid-cols-[minmax(0,1fr)_minmax(34rem,0.92fr)] lg:items-start lg:gap-14 lg:pt-20" : ""}`}
      >
        <div className={split ? "relative lg:min-h-[43rem] lg:pt-5" : ""} data-join-copy>
          <div className={headingAside ? "flex flex-wrap items-center justify-between gap-5" : ""}>
            <div>
              <p
                className={
                  joined
                    ? "sr-only"
                    : "flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#627169]"
                }
              >
                {!joined ? <span aria-hidden="true" className="h-px w-9 bg-[#e65c00]" /> : null}
                {eyebrow}
              </p>
              <h1
                className={`${joined ? "text-[clamp(3rem,4.5vw,4.5rem)]" : "mt-5"} text-balance font-[family-name:var(--aq-font-display)] font-normal leading-[0.98] tracking-[-0.055em] text-[var(--aq-ink)] ${split ? "max-w-6xl text-[clamp(4rem,7vw,7.25rem)]" : joined ? "" : "text-[clamp(3.2rem,5vw,5.5rem)]"}`}
              >
                {title}
                <span className="text-[#e65c00]">.</span>
              </h1>
              <p
                className={`${joined ? "mt-1" : "mt-4"} max-w-xl text-pretty ${split ? "font-[family-name:var(--aq-font-display)] text-2xl leading-9" : "text-lg leading-7"} text-[#526159]`}
              >
                {intro}
              </p>
            </div>
            {headingAside}
          </div>
          {split ? (
            <Image
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -left-10 hidden h-auto w-[125%] max-w-none translate-y-14 opacity-55 grayscale lg:block"
              data-join-artwork
              height={724}
              src="/images/college-campus-engraving.png"
              width={2172}
            />
          ) : null}
        </div>
        <div
          className={
            split
              ? "relative w-full pb-10 lg:justify-self-end lg:pb-0"
              : joined
                ? "mt-6"
                : "mt-8 sm:mt-10"
          }
          data-join-panel
        >
          {children}
        </div>
      </div>
    </main>
  );
}
