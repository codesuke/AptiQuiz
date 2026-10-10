import { headers } from "next/headers";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerificationForm } from "@/components/auth/verification-resend";
import { getActiveSession } from "@/lib/auth";
import {
  VERIFICATION_LINK_LIFETIME_SECONDS,
  type VerificationLinkState,
  verificationLinkState,
} from "@/lib/email-verification";

export const dynamic = "force-dynamic";

const linkLifetimeHours = VERIFICATION_LINK_LIFETIME_SECONDS / 3600;

const failedLinkCopy: Record<Exclude<VerificationLinkState, "verified">, [string, string]> = {
  expired: [
    "This link has expired.",
    `Verification links work for ${linkLifetimeHours} hour. Request a new one below.`,
  ],
  invalid: [
    "This link is not valid.",
    "It may be incomplete or already replaced by a newer link. Request a new one below.",
  ],
};

function StateIcon({ tone, children }: Readonly<{ tone: "success" | "error"; children: string }>) {
  const colors = tone === "success" ? "bg-[#fff5e6] text-[#b84700]" : "bg-red-50 text-red-700";
  return (
    <div
      aria-hidden="true"
      className={`mt-8 grid size-12 place-items-center rounded-full text-xl font-semibold ${colors}`}
    >
      {children}
    </div>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ [key: string]: string | string[] | undefined }> }>) {
  const state = verificationLinkState((await searchParams).error);
  const shellLinks = {
    alternateAction: "Go to AptiQuiz",
    alternateHref: "/",
    alternatePrompt: "Ready to play?",
    eyebrow: "Email verification",
  };

  if (state === "verified") {
    return (
      <AuthShell
        {...shellLinks}
        subtitle="Your results can now earn College League points."
        title="Email verified."
      >
        <StateIcon tone="success">✓</StateIcon>
        <Link
          className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#b84700] px-5 font-medium text-white transition hover:bg-[#993a00] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#b84700]"
          href="/"
        >
          Continue to AptiQuiz
        </Link>
      </AuthShell>
    );
  }

  const session = await getActiveSession(await headers());
  const [title, subtitle] = failedLinkCopy[state];
  return (
    <AuthShell {...shellLinks} subtitle={subtitle} title={title}>
      <StateIcon tone="error">!</StateIcon>
      <ResendVerificationForm defaultEmail={session?.user.email ?? ""} />
    </AuthShell>
  );
}
