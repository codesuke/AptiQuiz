import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  alternateAction: string;
  alternateHref: string;
  alternatePrompt: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  alternateAction,
  alternateHref,
  alternatePrompt,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#fdfbf7] px-4 pb-4 text-[#111827] sm:px-8 sm:pb-8">
      <header className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4">
        <Link aria-label="AptiQuiz home" className="shrink-0" href="/">
          <Image
            alt=""
            className="h-auto w-36 sm:w-48"
            height={724}
            preload
            src="/brand/aptiquiz-logo.png"
            width={2172}
          />
        </Link>
        <p className="text-right text-xs text-[#4b5563] sm:text-sm">
          <span className="hidden sm:inline">{alternatePrompt} </span>
          <Link
            className="min-h-11 rounded-md px-1 py-3 text-[#e65c00] underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
            href={alternateHref}
          >
            {alternateAction}
          </Link>
        </p>
      </header>

      <div className="mx-auto grid min-h-[calc(100svh-108px)] max-w-[1600px] gap-8 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-12">
        <section
          aria-labelledby="auth-artwork-title"
          className="hidden overflow-hidden rounded-2xl bg-[#f7f4eb] lg:flex lg:flex-col"
        >
          <div className="p-12 xl:p-16">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#4b5563]">
              Practice. Compete. Improve.
            </p>
            <h2
              className="mt-6 text-5xl font-medium leading-[1.04] tracking-[-0.04em] xl:text-6xl"
              id="auth-artwork-title"
            >
              A sharper mind.
              <br />
              One Round at a time.
            </h2>
            <p className="mt-5 text-xl text-[#4b5563]">Build your accuracy. Find your pace.</p>
          </div>
          <div className="mx-8 mt-auto grid min-h-72 place-items-center rounded-t-xl bg-[radial-gradient(circle_at_30%_25%,#ffb380,transparent_35%),radial-gradient(circle_at_72%_70%,#e65c00,transparent_42%)] p-8 text-center text-2xl font-medium text-white shadow-inner">
            Race the clock.
            <br />
            Climb the Room.
          </div>
          <div className="mx-8 flex justify-around gap-4 border-t border-[#d4cfc5] py-6 text-xs text-[#4b5563]">
            <span>Live Rooms</span>
            <span>Question Sets</span>
            <span>College Leagues</span>
          </div>
        </section>

        <section
          aria-labelledby="auth-title"
          className="flex min-w-0 flex-col justify-center py-8 lg:pt-12"
        >
          <div className="mx-auto w-full max-w-[400px]">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#4b5563]">
              {eyebrow}
            </p>
            <h1
              className="mt-5 text-4xl font-medium tracking-[-0.045em] sm:text-[42px]"
              id="auth-title"
            >
              {title}
            </h1>
            <p className="mt-3 text-lg text-[#4b5563]">{subtitle}</p>
            {children}
          </div>
          <footer className="mx-auto mt-12 w-full max-w-[400px] text-center text-xs text-[#4b5563] lg:text-right">
            AptiQuiz · Accuracy meets pace.
          </footer>
        </section>
      </div>
    </main>
  );
}
