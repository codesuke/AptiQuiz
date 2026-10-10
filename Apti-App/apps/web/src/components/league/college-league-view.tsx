import type { CollegeLeague } from "@aptiquiz/database";
import {
  collegesLabel,
  EMPTY_COLLEGE_STANDINGS_LABEL,
  EMPTY_LEAGUE_LABEL,
  leaguePeriodLabel,
} from "./league-view";

const CELL = "px-2 py-2 align-top break-words sm:px-4";

export function CollegeLeagueView({ league }: Readonly<{ league: CollegeLeague }>) {
  return (
    <main className="mx-auto w-full max-w-[var(--aq-content-width)] px-5 py-10 text-[var(--aq-ink)] sm:px-8">
      <h1 className="font-[family-name:var(--aq-font-display)] text-4xl tracking-[-0.04em]">
        College League
      </h1>
      <p className="mt-2 text-[var(--aq-text-muted)]">{leaguePeriodLabel(league.period)}</p>
      {league.participants.length === 0 ? (
        <p className="mt-6 font-semibold" role="status">
          {EMPTY_LEAGUE_LABEL}
        </p>
      ) : (
        <table className="mt-6 w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Top Participants this week by total score</caption>
          <thead>
            <tr className="border-b border-[var(--aq-rule)]">
              <th className={`${CELL} w-12 sm:w-20`} scope="col">
                Rank
              </th>
              <th className={CELL} scope="col">
                Name
              </th>
              <th className={CELL} scope="col">
                Colleges
              </th>
              <th className={`${CELL} w-20 text-right sm:w-28`} scope="col">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {league.participants.map((row) => (
              <tr className="border-b border-[var(--aq-rule)]" key={row.userId}>
                <td className={CELL}>{row.rank}</td>
                <th className={`${CELL} font-semibold`} scope="row">
                  {row.displayName}
                </th>
                <td className={CELL}>{collegesLabel(row.colleges)}</td>
                <td className={`${CELL} text-right tabular-nums`}>{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className="mt-12 font-[family-name:var(--aq-font-display)] text-2xl tracking-[-0.03em]">
        Colleges
      </h2>
      {league.colleges.length === 0 ? (
        <p className="mt-4 font-semibold" role="status">
          {EMPTY_COLLEGE_STANDINGS_LABEL}
        </p>
      ) : (
        <table className="mt-4 w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Top Colleges this week by total score</caption>
          <thead>
            <tr className="border-b border-[var(--aq-rule)]">
              <th className={`${CELL} w-12 sm:w-20`} scope="col">
                Rank
              </th>
              <th className={CELL} scope="col">
                College
              </th>
              <th className={`${CELL} w-20 text-right sm:w-28`} scope="col">
                Total score
              </th>
            </tr>
          </thead>
          <tbody>
            {league.colleges.map((row) => (
              <tr className="border-b border-[var(--aq-rule)]" key={row.collegeId}>
                <td className={CELL}>{row.rank}</td>
                <th className={`${CELL} font-semibold`} scope="row">
                  {row.name}
                </th>
                <td className={`${CELL} text-right tabular-nums`}>{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
