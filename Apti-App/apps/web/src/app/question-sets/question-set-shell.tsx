import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./question-sets.module.css";

export function QuestionSetShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link aria-label="AptiQuiz home" className={styles.logo} href="/">
            <Image alt="" height={724} src="/brand/aptiquiz-logo.png" width={2172} />
          </Link>
          <span aria-hidden="true" className={styles.headerRule} />
          <Link className={styles.backLink} href={backHref}>
            <ArrowLeft aria-hidden="true" size={17} />
            {backLabel}
          </Link>
          <Link className={styles.headerHost} href="/host">
            Host a room <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}
