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
          className="relative hidden min-h-[680px] overflow-hidden rounded-[28px] bg-[#15191f] text-[#fdfbf7] lg:flex lg:flex-col"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(253,251,247,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(253,251,247,0.055)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="absolute -right-32 top-[18%] h-[34rem] w-[34rem] rounded-full border border-[#ffb380]/30" />
          <div className="absolute -right-10 top-[32%] h-[22rem] w-[22rem] rounded-full border border-[#ffb380]/20" />

          <div className="relative z-10 p-10 xl:p-14">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb380]">
              Aptitude, under pressure
            </p>
            <h2
              className="mt-7 max-w-xl text-[clamp(3rem,4.2vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.06em]"
              id="auth-artwork-title"
            >
              Every question is a chance to get sharper.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[#c9c4ba] xl:text-lg">
              Come back to the work: clear thinking, quick decisions, and another chance to improve.
            </p>
          </div>

          <div className="relative z-10 mx-8 mt-auto mb-8 xl:mx-10 xl:mb-10">
            <div className="relative max-w-[510px] rotate-[-3deg] rounded-2xl border border-white/15 bg-[#fdfbf7] p-5 text-[#111827] shadow-[20px_24px_0_rgba(230,92,0,0.9)] transition-transform duration-700 ease-out hover:rotate-0 xl:p-7">
              <div className="flex items-center justify-between gap-4 border-b border-[#e5e1d9] pb-4">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#76563f]">
                  Pattern reasoning
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-[#e65c00]" />
              </div>
              <p className="mt-6 max-w-sm text-xl font-medium leading-snug tracking-[-0.035em] xl:text-2xl">
                Which number completes the pattern?
              </p>
              <div className="mt-7 grid grid-cols-4 gap-2 font-mono text-sm font-semibold sm:gap-3">
                <span className="rounded-lg border border-[#ddd8cf] px-3 py-3 text-center text-[#4b5563]">
                  6
                </span>
                <span className="rounded-lg border border-[#ddd8cf] px-3 py-3 text-center text-[#4b5563]">
                  12
                </span>
                <span className="rounded-lg bg-[#b84700] px-3 py-3 text-center text-white shadow-[0_5px_0_#7f3000]">
                  18
                </span>
                <span className="rounded-lg border border-[#ddd8cf] px-3 py-3 text-center text-[#4b5563]">
                  24
                </span>
              </div>
            </div>
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
