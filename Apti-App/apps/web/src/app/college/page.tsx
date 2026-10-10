import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeCollegePicker } from "@/components/home-college-picker";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { getHomeCollege } from "@/lib/home-college";
import { resolveHostReturnTarget } from "@/lib/host-college";

export const dynamic = "force-dynamic";

export default async function CollegePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const current = await getHomeCollege(database, session.user.id);
  const returnTo = resolveHostReturnTarget((await searchParams).next);
  return (
    <main className="min-h-screen bg-[#efece5] px-6 py-10 text-stone-900">
      <section className="mx-auto max-w-xl">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-medium text-[#b84700] underline underline-offset-4"
          href="/"
        >
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your Home College</h1>
        <p className="mt-2 text-stone-600">
          {current
            ? `You represent ${current.name}. Pick another College to change it.`
            : "Choose the College you represent. Your Rooms and League results use it."}
        </p>
        <div className="mt-8">
          <HomeCollegePicker current={current} returnTo={returnTo} />
        </div>
      </section>
    </main>
  );
}
