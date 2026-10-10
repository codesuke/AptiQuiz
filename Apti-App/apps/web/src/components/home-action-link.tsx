"use client";

import { MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

const MotionLink = motion.create(Link);

const linkVariants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.02 },
  tap: { y: 0, scale: 0.97 },
};

const iconVariants = {
  rest: { x: 0 },
  hover: { x: 3 },
  tap: { x: 1 },
};

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
    <MotionConfig reducedMotion="user">
      <MotionLink
        className={className}
        href={href}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap="tap"
        variants={linkVariants}
        transition={{ type: "spring", stiffness: 450, damping: 28, mass: 0.65 }}
      >
        {label}
        <motion.span aria-hidden="true" className={iconClassName} variants={iconVariants}>
          {icon}
        </motion.span>
      </MotionLink>
    </MotionConfig>
  );
}
