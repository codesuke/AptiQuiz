import type { LeaderboardEntry } from "@aptiquiz/contracts";
import { isOwnRow, movementView } from "./leaderboard-view";
import { LivePulse } from "./live-motion";

interface LeaderboardProps {
  readonly entries: readonly LeaderboardEntry[];
  /** The viewing Participant's id; null for the Host. */
  readonly viewerId: string | null;
}

/** Cumulative standings after this Round, best rank first. */
export function Leaderboard({ entries, viewerId }: LeaderboardProps) {
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
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const own = isOwnRow(entry, viewerId);
              const movement = movementView(entry.movement);
              return (
                <tr
                  aria-current={own ? "true" : undefined}
                  className={`border-t border-stone-200 ${own ? "bg-amber-50 font-semibold" : ""}`}
                  key={entry.participantId}
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
                  <td className="py-2 text-right tabular-nums">{entry.totalScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
