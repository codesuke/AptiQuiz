import type { RoundScore } from "@aptiquiz/contracts";

interface RoundScoresProps {
  readonly scores: readonly RoundScore[];
}

/** Every joined Participant's points for this Round, in join order. */
export function RoundScores({ scores }: RoundScoresProps) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-stone-900">Round scores</h3>
      {scores.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">No Participants in this Round.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-stone-600">
            <tr>
              <th className="py-1 font-medium" scope="col">
                Name
              </th>
              <th className="py-1 text-right font-medium" scope="col">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr className="border-t border-stone-200" key={score.participantId}>
                <td className="py-2">{score.displayName}</td>
                <td className="py-2 text-right tabular-nums">{score.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
