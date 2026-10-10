import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSession } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getActiveSession(await headers());
  const role = resolveRole(session);

  if (role === "guest") redirect("/sign-in");
  if (role !== "admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fdfbf7] px-6 text-[#111827]">
        <div>
          <h1 className="text-3xl font-semibold">Not allowed</h1>
          <p className="mt-3">Your account does not have Admin access.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fdfbf7] px-6 text-[#111827]">
      <div>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-3">The Admin area is ready for future controls.</p>
      </div>
    </main>
  );
}
