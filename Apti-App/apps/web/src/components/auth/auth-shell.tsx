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
    <main className="min-h-screen bg-[#fdfbf7] px-5 pb-5 text-[#111827] sm:px-8 sm:pb-8">
      <header className="mx-auto flex min-h-[88px] max-w-[1500px] items-center justify-between gap-4 sm:min-h-[100px]">
        <Link aria-label="AptiQuiz home" className="shrink-0" href="/">
          <Image
            alt=""
            className="h-auto w-36 sm:w-44"
            height={724}
            preload
            src="/brand/aptiquiz-logo.png"
            width={2172}
          />
        </Link>
        <p className="text-right text-sm text-[#4b5563]">
          <span className="hidden sm:inline">{alternatePrompt} </span>
          <Link
            className="inline-flex min-h-11 items-center rounded-md px-1 font-semibold text-[#b84700] underline decoration-[#eeb58d] underline-offset-4 transition hover:decoration-[#b84700] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
            href={alternateHref}
          >
            {alternateAction}
          </Link>
        </p>
      </header>

      <div className="mx-auto grid min-h-[calc(100svh-120px)] max-w-[1500px] gap-8 lg:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] lg:gap-0">
        <section
          aria-labelledby="auth-artwork-title"
          className="relative hidden min-h-[680px] overflow-hidden rounded-[28px] bg-[#f7e7d3] lg:flex lg:flex-col"
        >
          <Image
            alt=""
            className="object-cover object-center"
            fill
            priority
            sizes="(min-width: 1024px) 54vw, 0px"
            src="/images/auth-orbit.png"
          />
          <div className="relative z-10 p-10 xl:p-14">
            <p className="inline-flex rounded-full border border-[#b84700]/20 bg-[#fdfbf7]/75 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#85400f] backdrop-blur-sm">
              Practice · Compete · Improve
            </p>
            <h2
              className="mt-7 max-w-[650px] text-[clamp(2.8rem,4vw,4.4rem)] font-medium leading-[1.03] tracking-[-0.055em]"
              id="auth-artwork-title"
            >
              Make every second
              <br />
              count.
            </h2>
            <p className="mt-5 max-w-[360px] text-base leading-relaxed text-[#4b5563] xl:text-lg">
              Build your accuracy. Find your pace. Come back ready for the next Round.
            </p>
          </div>
          <div className="relative z-10 m-8 mt-auto flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-[#fdfbf7]/80 px-5 py-4 text-sm text-[#54351f] shadow-[0_12px_36px_rgba(107,65,20,0.1)] backdrop-blur-md xl:m-10 xl:px-6">
            <span className="font-medium">Accuracy meets pace.</span>
            <span aria-hidden="true" className="font-mono text-xs tracking-[0.16em]">
              APTIQUIZ / 01
            </span>
          </div>
        </section>

        <section
          aria-labelledby="auth-title"
          className="flex min-w-0 flex-col justify-center py-8 sm:py-12 lg:px-10 xl:px-20"
        >
          <div className="mx-auto w-full max-w-[420px]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b84700]">
              {eyebrow}
            </p>
            <h1
              className="mt-5 text-[clamp(2.7rem,5vw,3.6rem)] font-medium leading-[1.05] tracking-[-0.055em]"
              id="auth-title"
            >
              {title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#4b5563] sm:text-lg">{subtitle}</p>
            {children}
          </div>
          <footer className="mx-auto mt-12 w-full max-w-[420px] border-t border-[#e5e1d9] pt-5 text-xs text-[#6b7280]">
            © {new Date().getFullYear()} AptiQuiz. Keep your edge.
          </footer>
        </section>
      </div>
    </main>
  );
}
