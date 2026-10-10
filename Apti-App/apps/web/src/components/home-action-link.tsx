import Link from "next/link";
import type { ReactNode } from "react";

interface HomeActionLinkProps {
  href: string;
  className?: string;
  label: string;
  icon: ReactNode;
  iconClassName?: string;
}

export function HomeActionLink({
  href,
  className,
  label,
  icon,
  iconClassName,
}: HomeActionLinkProps) {
  return (
    <Link className={className} href={href}>
      {label}
      <span aria-hidden="true" className={iconClassName}>
        {icon}
      </span>
    </Link>
  );
}
