"use client";

import Link from "next/link";
import { useState } from "react";

export function AccountMenu({
  name,
  collegeName,
}: Readonly<{ name: string | null; collegeName: string | null }>) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!name) {
    return (
      <Link
        className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white/70 px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
        href="/sign-in"
      >
        Sign in
      </Link>
    );
  }

  async function signOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", {
        body: "{}",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium sm:inline">{name}</span>
      <Link
        className="inline-flex min-h-11 max-w-48 items-center truncate rounded-full border border-stone-300 bg-white/70 px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
        href="/college"
      >
        {collegeName ?? "Choose College"}
      </Link>
      <button
        className="min-h-11 rounded-full border border-stone-300 bg-white/70 px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e65c00]"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
