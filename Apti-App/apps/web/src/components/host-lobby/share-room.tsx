"use client";

import { Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { buildJoinLink, buildRoomInvite } from "@/lib/rooms-client";

interface ShareRoomProps {
  readonly joinCode: string;
  readonly collegeName: string;
}

// Large enough to scan from a phone held at arm's length across a desk.
const QR_CODE_SIZE_PX = 256;
const QR_QUIET_ZONE_MODULES = 4;

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 font-semibold text-stone-900 hover:border-[#b84700] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84700] disabled:cursor-not-allowed disabled:opacity-60";

function isShareCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ShareRoom({ joinCode, collegeName }: ShareRoomProps) {
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
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold" id="share-room-heading">
        Invite players
      </h2>
      <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        Join Code
      </p>
      <p className="mt-1 font-mono text-5xl font-semibold tracking-[0.2em] text-[#b84700] sm:text-6xl">
        {joinCode}
      </p>

      <div className="mt-5 flex justify-center rounded-xl bg-white">
        {joinLink ? (
          <QRCodeSVG
            bgColor="#ffffff"
            className="h-auto w-full max-w-64"
            fgColor="#111827"
            level="M"
            marginSize={QR_QUIET_ZONE_MODULES}
            size={QR_CODE_SIZE_PX}
            title={`QR code for the join link ${joinLink}`}
            value={joinLink}
          />
        ) : (
          <div
            aria-hidden="true"
            className="aspect-square w-full max-w-64 rounded-lg bg-stone-100"
          />
        )}
      </div>

      <p className="mt-4 break-all rounded-lg bg-stone-50 px-3 py-2 font-mono text-sm text-stone-700">
        {joinLink || "Preparing join link…"}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          className={buttonClass}
          onClick={() => copy(joinCode, "Join Code copied")}
          type="button"
        >
          <Copy aria-hidden="true" className="size-4" />
          Copy code
        </button>
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
          className={`${buttonClass} border-[#b84700] bg-[#b84700] text-white hover:bg-[#993a00]`}
          disabled={!joinLink}
          onClick={share}
          type="button"
        >
          <Share2 aria-hidden="true" className="size-4" />
          Share
        </button>
      </div>
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-sm font-medium text-emerald-800"
        role="status"
      >
        {notice}
      </p>
    </section>
  );
}
