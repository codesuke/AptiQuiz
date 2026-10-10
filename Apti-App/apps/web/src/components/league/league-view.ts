const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utcDay(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export const EMPTY_LEAGUE_LABEL = "No eligible results yet this week.";
export const EMPTY_COLLEGE_STANDINGS_LABEL = "No College has eligible results yet this week.";

/** "Mon 5 Oct – Sun 11 Oct 2026 (UTC)" for a period whose end is the exclusive next Monday. */
export function leaguePeriodLabel(period: { start: Date; end: Date }): string {
  const lastDay = new Date(period.end.getTime() - DAY_MS);
  return `${utcDay(period.start)} – ${utcDay(lastDay)} ${lastDay.getUTCFullYear()} (UTC)`;
}

export function collegesLabel(colleges: readonly string[]): string {
  return colleges.join(", ");
}
