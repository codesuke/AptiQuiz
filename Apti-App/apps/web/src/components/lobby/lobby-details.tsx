import type { LobbyParticipant, LobbySnapshot } from "@aptiquiz/contracts";
import { Building2, Gauge, Hash, ListChecks, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
  participantCountLabel,
  questionCountLabel,
  scoringRuleText,
  scoringSummaryText,
} from "./lobby-copy";

interface LobbyDetailsProps {
  readonly lobby: LobbySnapshot;
  readonly action?: ReactNode;
  readonly compact?: boolean;
  readonly hostLobby?: boolean;
}

/** Room facts, live roster, and scoring rule. Presentational and safe to render on the server. */
export function LobbyDetails({
  lobby,
  action,
  compact = false,
  hostLobby = false,
}: LobbyDetailsProps) {
  return (
    <section
      aria-labelledby="lobby-title"
      className={`rounded-xl border border-[var(--aq-rule)] bg-white p-5 text-[var(--aq-ink)] sm:p-7 ${hostLobby ? "flex h-full flex-col" : ""}`}
    >
      <h2 className="sr-only" id="lobby-title">
        Room details
      </h2>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-[family-name:var(--aq-font-display)] text-[2.4rem] tracking-[-0.04em] text-[var(--aq-ink)]">
            <Users aria-hidden="true" className="size-5 text-[#627169]" />
            Players
          </h3>
          <p
            aria-atomic="true"
            aria-live="polite"
            className="font-mono text-sm font-semibold text-[var(--aq-text-muted)]"
          >
            <span className="sr-only">Players in the Room: </span>
            {participantCountLabel(lobby.participants.length)}
          </p>
        </div>
        <ParticipantRoster participants={lobby.participants} />
      </div>

      {hostLobby ? (
        <div className="mt-auto pt-6">
          <ScoringRuleCard lobby={lobby} embedded />
        </div>
      ) : null}
      {action ? <div className="mt-6 border-t border-[var(--aq-rule)] pt-5">{action}</div> : null}
      {!compact && !hostLobby ? <RoomFactsCard lobby={lobby} embedded /> : null}
      {!compact && !hostLobby ? (
        <div className="mt-5">
          <ScoringRuleCard lobby={lobby} embedded />
        </div>
      ) : null}
    </section>
  );
}

export function RoomFactsCard({
  lobby,
  embedded = false,
}: {
  readonly lobby: LobbySnapshot;
  readonly embedded?: boolean;
}) {
  return (
    <section
      aria-label="Room facts"
      className={
        embedded
          ? "mt-6 border-t border-[var(--aq-rule)] pt-5"
          : "rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"
      }
    >
      <h2 className="font-[family-name:var(--aq-font-display)] text-2xl text-[var(--aq-ink)]">
        Room details
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <LobbyFact icon={<Building2 aria-hidden="true" className="size-4" />} label="College">
          {lobby.college.name}
        </LobbyFact>
        <LobbyFact icon={<Hash aria-hidden="true" className="size-4" />} label="Join Code">
          <span className="font-mono tracking-[0.1em] text-[var(--aq-action)]">
            {lobby.joinCode}
          </span>
        </LobbyFact>
        <LobbyFact icon={<ListChecks aria-hidden="true" className="size-4" />} label="Questions">
          {questionCountLabel(lobby.questionCount)}
        </LobbyFact>
      </dl>
    </section>
  );
}

export function ScoringRuleCard({
  lobby,
  embedded = false,
}: {
  readonly lobby: LobbySnapshot;
  readonly embedded?: boolean;
}) {
  return (
    <section
      aria-label="Scoring rules"
      className={embedded ? "" : "rounded-xl border border-[var(--aq-rule)] bg-white p-5 sm:p-7"}
    >
      <h2 className="flex items-center gap-2 font-[family-name:var(--aq-font-display)] text-2xl text-[var(--aq-ink)]">
        <Gauge aria-hidden="true" className="size-5 text-[var(--aq-action)]" /> Scoring
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--aq-text-muted)]">{scoringSummaryText()}</p>
      <details className="mt-3 text-sm text-[var(--aq-text-muted)]">
        <summary className="cursor-pointer font-semibold text-[var(--aq-action)]">
          Full scoring and timing rules
        </summary>
        <p className="mt-2 leading-6">{scoringRuleText(lobby.rules)}</p>
      </details>
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
    <div className="min-w-0">
      <dt className="flex items-center gap-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[var(--aq-text-muted)]">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 break-words font-semibold leading-6 text-[var(--aq-ink)]">
        {children}
      </dd>
    </div>
  );
}

function ParticipantRoster({ participants }: { readonly participants: LobbyParticipant[] }) {
  if (participants.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-[var(--aq-rule)] px-4 py-5 text-center text-sm text-[var(--aq-text-muted)]">
        No players yet. Share the Join Code to fill the Room.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-[var(--aq-rule)]">
      {participants.map((participant) => (
        <li
          className="flex min-h-16 min-w-0 items-center gap-3 py-2"
          key={participant.participantId}
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--aq-ink)] text-sm font-semibold text-white"
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
