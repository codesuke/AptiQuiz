import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { HOST_PATH, requireHostCollege } from "@/lib/host-college";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const decision = await requireHostCollege(database, session.user.id);
  if (!decision.ok) redirect(`/college?next=${encodeURIComponent(HOST_PATH)}`);

  return (
    <main className="min-h-screen bg-[#efece5] px-6 py-10 text-stone-900">
      <section className="mx-auto max-w-xl">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-medium text-[#b84700] underline underline-offset-4"
          href="/"
        >
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Host a match</h1>
        <p className="mt-2 text-stone-600">
          Your Room will belong to {decision.college.name}.{" "}
          <Link className="font-medium text-[#b84700] underline underline-offset-4" href="/college">
            Change College
          </Link>
        </p>
        <p className="mt-6 rounded-xl border border-stone-200 bg-white/60 p-4 text-sm text-stone-600">
          Creating a Room is not available yet.
        </p>
      </section>
    </main>
  );
}
