import "server-only";
import { chooseHomeCollegeSchema } from "@aptiquiz/contracts";
import { normalizeCollegeName, type PrismaClient } from "@aptiquiz/database";

const SEARCH_RESULT_LIMIT = 20;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

export interface HomeCollege {
  id: string;
  name: string;
}

type SessionAccess =
  | { kind: "guest" }
  | { kind: "suspended" }
  | { kind: "active"; user: { id: string } };

interface HomeCollegeDependencies {
  database: PrismaClient;
  getSessionAccess(headers: Headers): Promise<SessionAccess>;
}

const noStoreHeaders = { "cache-control": "no-store" };

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

function refuseInactive(access: Exclude<SessionAccess, { kind: "active" }>) {
  return access.kind === "guest"
    ? reply({ error: "unauthorized" }, HTTP_UNAUTHORIZED)
    : reply({ error: "account_suspended" }, HTTP_FORBIDDEN);
}

export async function getHomeCollege(
  database: PrismaClient,
  userId: string,
): Promise<HomeCollege | null> {
  const user = await database.user.findUnique({
    where: { id: userId },
    select: { homeCollege: { select: { id: true, name: true } } },
  });
  return user?.homeCollege ?? null;
}

function searchColleges(database: PrismaClient, query: string) {
  const words = normalizeCollegeName(query).split(" ").filter(Boolean);
  return database.college.findMany({
    where: { AND: words.map((word) => ({ normalizedName: { contains: word } })) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: SEARCH_RESULT_LIMIT,
  });
}

export function createHomeCollegeHandlers(dependencies: HomeCollegeDependencies) {
  const { database, getSessionAccess } = dependencies;

  return {
    async GET(request: Request): Promise<Response> {
      const access = await getSessionAccess(request.headers);
      if (access.kind !== "active") return refuseInactive(access);

      const query = new URL(request.url).searchParams.get("q") ?? "";
      return reply({ colleges: await searchColleges(database, query) });
    },

    async PUT(request: Request): Promise<Response> {
      const access = await getSessionAccess(request.headers);
      if (access.kind !== "active") return refuseInactive(access);

      const body = chooseHomeCollegeSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) return reply({ error: "invalid_request" }, HTTP_BAD_REQUEST);

      const college = await database.college.findUnique({
        where: { id: body.data.collegeId },
        select: { id: true, name: true },
      });
      if (!college) return reply({ error: "college_not_found" }, HTTP_NOT_FOUND);

      await database.user.update({
        where: { id: access.user.id },
        data: { homeCollegeId: college.id },
      });
      return reply({ homeCollege: college });
    },
  };
}
