"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { buildJoinLink } from "@/lib/rooms-client";

const QR_QUIET_ZONE_MODULES = 4;
const QR_FOREGROUND = "#102e26";

/** The join link depends on the browser's origin, so it is resolved after hydration. */
export function useJoinLink(joinCode: string): string {
  const [joinLink, setJoinLink] = useState("");
  useEffect(() => {
    setJoinLink(buildJoinLink(window.location.origin, joinCode));
  }, [joinCode]);
  return joinLink;
}

interface JoinQrCodeProps {
  readonly joinLink: string;
  readonly sizePx: number;
  readonly className: string;
}

/** The scannable join link, or a same-sized placeholder until the link is known. */
export function JoinQrCode({ joinLink, sizePx, className }: JoinQrCodeProps) {
  if (!joinLink) {
    return (
      <div aria-hidden="true" className={`aspect-square bg-[var(--aq-surface)] ${className}`} />
    );
  }
  return (
    <QRCodeSVG
      bgColor="#ffffff"
      className={`h-auto ${className}`}
      fgColor={QR_FOREGROUND}
      level="M"
      marginSize={QR_QUIET_ZONE_MODULES}
      size={sizePx}
      title={`QR code for the join link ${joinLink}`}
      value={joinLink}
    />
  );
}
