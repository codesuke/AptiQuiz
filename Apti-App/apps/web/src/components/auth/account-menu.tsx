"use client";

import { GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./account-menu.module.css";

export function AccountMenu({
  name,
  collegeName,
}: Readonly<{ name: string | null; collegeName: string | null }>) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!name) {
    return (
      <Link className={styles.signIn} href="/sign-in">
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
    <div className={styles.account}>
      <Link
        className={styles.college}
        href="/college"
        title={collegeName ?? "Choose your Home College"}
      >
        <GraduationCap
          aria-hidden="true"
          className={styles.collegeIcon}
          size={20}
          strokeWidth={1.8}
        />
        <span className={styles.collegeName}>{collegeName ?? "Choose College"}</span>
      </Link>
      <span className={styles.person} title={name}>
        <span aria-hidden="true" className={styles.avatar}>
          {name.trim().charAt(0).toLocaleUpperCase()}
        </span>
        <span className={styles.personName}>{name}</span>
      </span>
      <button
        aria-label="Sign out"
        className={styles.signOut}
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
        <span className={styles.signOutText}>{isSigningOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}
