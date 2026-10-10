"use client";

import { Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { buildJoinLink, buildRoomInvite } from "@/lib/rooms-client";
import { cn } from "@/lib/utils";

interface ShareRoomProps {
  readonly joinCode: string;
  readonly collegeName: string;
  readonly compact?: boolean;
}

// Large enough to scan from a phone held at arm's length across a desk.
const QR_CODE_SIZE_PX = 256;
const QR_QUIET_ZONE_MODULES = 4;

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/45 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60";

function isShareCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ShareRoom({ joinCode, collegeName, compact = false }: ShareRoomProps) {
  // The link depends on the browser's origin, so it is resolved after hydration.
  const [joinLink, setJoinLink] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setJoinLink(buildJoinLink(window.location.origin, joinCode));
  }, [joinCode]);

  async function copy(text: string, confirmation: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(confirmation);
    } catch {
      setNotice("Copy failed. Select the text and copy it yourself.");
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") {
      await copy(joinLink, "Link copied");
      return;
    }
    try {
      await navigator.share({
        title: "AptiQuiz Room",
        text: buildRoomInvite(collegeName, joinCode),
        url: joinLink,
      });
      setNotice("");
    } catch (error) {
      if (!isShareCancelled(error)) await copy(joinLink, "Link copied");
    }
  }

  return (
    <section
      aria-labelledby="share-room-heading"
      className="overflow-hidden rounded-xl bg-[var(--aq-ink)] p-5 text-white shadow-[0_24px_45px_-34px_rgba(16,46,38,0.7)] sm:p-8"
    >
      <p
        className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--aq-text-on-dark)]"
        id="share-room-heading"
      >
        {compact ? "Room code" : "Invite players"}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p
          className={`min-w-0 break-all font-mono font-semibold tracking-[0.13em] text-white ${compact ? "text-3xl sm:text-4xl" : "text-[clamp(2.6rem,6vw,5.6rem)] leading-none"}`}
        >
          {joinCode}
        </p>
        <button
          className={buttonClass}
          onClick={() => copy(joinCode, "Join Code copied")}
          type="button"
        >
          <Copy aria-hidden="true" className="size-4" /> Copy code
        </button>
      </div>
      {!compact ? (
        <p className="mt-3 text-sm text-[var(--aq-text-on-dark)]">
          Players can enter this code at the Join page.
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-7 grid items-center gap-5 border-t border-white/20 pt-7 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)]">
          <div>
            <p className="mb-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--aq-text-on-dark)]">
              Scan to join
            </p>
            <div className="w-fit rounded-lg bg-white p-2">
              {joinLink ? (
                <QRCodeSVG
                  bgColor="#ffffff"
                  className="h-auto w-full max-w-64"
                  fgColor="#102e26"
                  level="M"
                  marginSize={QR_QUIET_ZONE_MODULES}
                  size={QR_CODE_SIZE_PX}
                  title={`QR code for the join link ${joinLink}`}
                  value={joinLink}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="aspect-square w-64 max-w-full bg-[var(--aq-surface)]"
                />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--aq-text-on-dark)]">
              Join link
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-white">
              {joinLink || "Preparing join link…"}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                className={buttonClass}
                disabled={!joinLink}
                onClick={() => copy(joinLink, "Link copied")}
                type="button"
              >
                <Copy aria-hidden="true" className="size-4" />
                Copy link
              </button>
              <button
                className={cn(
                  buttonClass,
                  "border-[var(--aq-action-prominent)] bg-[var(--aq-action-prominent)] hover:bg-[var(--aq-action-prominent-hover)]",
                )}
                disabled={!joinLink}
                onClick={share}
                type="button"
              >
                <Share2 aria-hidden="true" className="size-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-sm font-medium text-[#ffbd91]"
        role="status"
      >
        {notice}
      </p>
    </section>
  );
}
