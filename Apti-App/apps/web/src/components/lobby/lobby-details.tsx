import type { LobbyParticipant, LobbySnapshot } from "@aptiquiz/contracts";
import { Building2, Gauge, Hash, ListChecks, Users } from "lucide-react";
import type { ReactNode } from "react";
import { participantCountLabel, questionCountLabel, scoringRuleText } from "./lobby-copy";

interface LobbyDetailsProps {
  readonly lobby: LobbySnapshot;
}

/** Room facts, live roster, and scoring rule. Presentational and safe to render on the server. */
export function LobbyDetails({ lobby }: LobbyDetailsProps) {
  return (
    <section
      aria-labelledby="lobby-title"
      className="rounded-2xl border border-[#e4dfd3] bg-[#f7f4eb] p-5 text-[#1d2925] shadow-[0_20px_44px_-34px_rgba(18,42,34,0.55)] sm:p-7"
    >
      <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#627169]">
        Lobby
      </p>
      <h2
        className="mt-2 text-balance text-2xl font-semibold tracking-[-0.03em] text-[#172823] sm:text-3xl"
        id="lobby-title"
      >
        {lobby.questionSetTitle}
      </h2>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <LobbyFact icon={<Building2 aria-hidden="true" className="size-4" />} label="College">
          {lobby.college.name}
        </LobbyFact>
        <LobbyFact icon={<Hash aria-hidden="true" className="size-4" />} label="Join Code">
          <span className="font-mono text-xl tracking-[0.18em] text-[#b84700]">
            {lobby.joinCode}
          </span>
        </LobbyFact>
        <LobbyFact icon={<ListChecks aria-hidden="true" className="size-4" />} label="Questions">
          {questionCountLabel(lobby.questionCount)}
        </LobbyFact>
      </dl>

      <div className="mt-6 flex items-start gap-3 rounded-xl border-l-2 border-[#e65c00] bg-white/70 px-4 py-3 text-sm leading-6 text-[#38463f]">
        <Gauge aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#b84700]" />
        <p>
          <span className="font-semibold text-[#172823]">Scoring. </span>
          {scoringRuleText(lobby.rules)}
        </p>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-[#172823]">
            <Users aria-hidden="true" className="size-4 text-[#627169]" />
            Players
          </h3>
          <p
            aria-atomic="true"
            aria-live="polite"
            className="font-mono text-sm font-semibold text-[#38463f]"
          >
            <span className="sr-only">Players in the Room: </span>
            {participantCountLabel(lobby.participants.length)}
          </p>
        </div>
        <ParticipantRoster participants={lobby.participants} />
      </div>
    </section>
  );
}

interface LobbyFactProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
}

function LobbyFact({ icon, label, children }: LobbyFactProps) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e4dfd3] bg-[#fdfbf7] px-4 py-3">
      <dt className="flex items-center gap-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#627169]">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 break-words font-semibold leading-6 text-[#172823]">{children}</dd>
    </div>
  );
}

function ParticipantRoster({ participants }: { readonly participants: LobbyParticipant[] }) {
  if (participants.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-[#d6d1c4] px-4 py-5 text-center text-sm text-[#627169]">
        No players yet. Share the Join Code to fill the Room.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {participants.map((participant) => (
        <li
          className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-[#e4dfd3] bg-[#fdfbf7] px-3 py-2"
          key={participant.participantId}
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[#19352d] text-sm font-semibold text-[#fdfbf7]"
          >
            {participant.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium" title={participant.displayName}>
            {participant.displayName}
          </span>
          {participant.isGuest ? (
            <span className="shrink-0 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#7a857f]">
              Guest
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
