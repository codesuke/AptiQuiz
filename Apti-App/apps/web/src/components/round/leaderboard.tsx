import type { LeaderboardEntry } from "@aptiquiz/contracts";
import { isOwnRow, movementView } from "./leaderboard-view";
import { LivePulse, RankRow } from "./live-motion";
import { roundPointsLabel } from "./reveal-outcome";

interface LeaderboardProps {
  readonly entries: readonly LeaderboardEntry[];
  /** The viewing Participant's id; null for the Host. */
  readonly viewerId: string | null;
  /** The revealed Round points by Participant id; omit to show totals only. */
  readonly roundPoints?: ReadonlyMap<string, number>;
}

/** Cumulative standings after this Round, best rank first. */
export function Leaderboard({ entries, viewerId, roundPoints }: LeaderboardProps) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-stone-900">Leaderboard</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">No Participants in this Round.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-stone-600">
            <tr>
              <th className="py-1 font-medium" scope="col">
                Rank
              </th>
              <th className="py-1 font-medium" scope="col">
                Name
              </th>
              <th className="py-1 font-medium" scope="col">
                Move
              </th>
              <th className="py-1 text-right font-medium" scope="col">
                {roundPoints ? "Round · Total" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const own = isOwnRow(entry, viewerId);
              const movement = movementView(entry.movement);
              return (
                <RankRow
                  className={`border-t border-stone-200 ${own ? "bg-amber-50 font-semibold" : "bg-white"}`}
                  current={own}
                  key={entry.participantId}
                  movement={entry.movement}
                  order={index}
                >
                  <td className="py-2 tabular-nums">{entry.rank}</td>
                  <td className="py-2">
                    {entry.displayName}
                    {own ? " (you)" : ""}
                  </td>
                  <td className="py-2 tabular-nums">
                    <span aria-label={movement.ariaLabel} role="img">
                      <LivePulse key={`${entry.rank}-${entry.movement}`}>{movement.text}</LivePulse>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    <RoundPoints points={roundPoints?.get(entry.participantId)} />
                    {entry.totalScore}
                  </td>
                </RankRow>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** This Round's points beside the total; earned points stand out, a zero stays quiet. */
function RoundPoints({ points }: { readonly points: number | undefined }) {
  if (points === undefined) return null;
  const earned = points > 0;
  return (
    <span
      className={`mr-3 inline-block rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
        earned ? "bg-[#e7f0e9] text-[var(--aq-ink)]" : "text-[var(--aq-text-muted)]"
      }`}
    >
      <span className="sr-only">This Round: </span>
      <LivePulse>{roundPointsLabel(points)}</LivePulse>
      <span className="sr-only">. Total: </span>
    </span>
  );
}
