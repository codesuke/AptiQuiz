import { UsersRound } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeCollegePicker } from "@/components/home-college-picker";
import { getActiveSession } from "@/lib/auth";
import { database } from "@/lib/database";
import { getHomeCollege } from "@/lib/home-college";
import { resolveHostReturnTarget } from "@/lib/host-college";
import styles from "./college.module.css";

export const dynamic = "force-dynamic";

export default async function CollegePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const session = await getActiveSession(await headers());
  if (!session) redirect("/sign-in");

  const current = await getHomeCollege(database, session.user.id);
  const returnTo = resolveHostReturnTarget((await searchParams).next);
  const initials = session.user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link aria-label="AptiQuiz home" className={styles.brand} href="/">
              <Image
                alt=""
                className={styles.brandImage}
                height={724}
                priority
                src="/brand/aptiquiz-logo.png"
                width={2172}
              />
            </Link>
            <span aria-hidden="true" className={styles.headerRule} />
            <span className={styles.headerContext}>for College</span>
          </div>
          <div className={styles.accountGroup}>
            <span className={styles.headerTagline}>Brighter Minds. A More Curious Tomorrow.</span>
            <span aria-hidden="true" className={styles.headerRule} />
            <span
              aria-label={`Signed in as ${session.user.name}`}
              className={styles.avatar}
              role="img"
            >
              {initials || "U"}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.lead} aria-labelledby="college-title">
          <div>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.eyebrowRule} />
              College League
            </p>
            <h1 id="college-title" className={styles.title}>
              Represent
              <br />
              your College.
            </h1>
            <p className={styles.leadCopy}>
              Choose the College you represent. Your Rooms and College League results use it.
            </p>
          </div>
          <Image
            alt=""
            className={styles.campus}
            height={724}
            loading="eager"
            src="/images/college-campus-engraving.png"
            width={2172}
          />
          <p className={styles.campusCaption}>Colleges today. A brighter tomorrow.</p>
        </section>

        <section aria-label="Choose your Home College" className={styles.picker}>
          <HomeCollegePicker current={current} returnTo={returnTo} />
        </section>

        <aside className={styles.aside}>
          <p className={`${styles.eyebrow} ${styles.asideEyebrow}`}>
            <UsersRound aria-hidden="true" className={styles.asideIcon} />A note about Rooms
          </p>
          <h2 className={styles.asideTitle}>
            One College.
            <br />
            Every Room.
          </h2>
          <p className={styles.asideCopy}>
            Your Home College is the College you represent. You can change it here.
          </p>
        </aside>
      </div>
    </main>
  );
}
