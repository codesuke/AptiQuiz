import { getCollegeLeague } from "@aptiquiz/database";
import { CollegeLeagueView } from "@/components/league/college-league-view";
import { database } from "@/lib/database";

export const dynamic = "force-dynamic";

export const metadata = { title: "College League" };

export default async function LeaguePage() {
  const league = await getCollegeLeague(database, new Date());
  return <CollegeLeagueView league={league} />;
}
