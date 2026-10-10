import "server-only";
import type { College } from "@aptiquiz/contracts";
import type { PrismaClient } from "@aptiquiz/database";
import { getHomeCollege } from "./home-college";

export const HOST_PATH = "/host";

export type HostCollegeDecision =
  | { ok: true; college: College }
  | { ok: false; reason: "home_college_required" };

export async function requireHostCollege(
  database: PrismaClient,
  userId: string,
): Promise<HostCollegeDecision> {
  const college = await getHomeCollege(database, userId);
  return college ? { ok: true, college } : { ok: false, reason: "home_college_required" };
}

/** Only allow-listed paths may follow the College picker, so `next` cannot redirect off-site. */
export function resolveHostReturnTarget(target: string | undefined): string | null {
  if (target === HOST_PATH) return HOST_PATH;
  return target && /^\/host\?questionSetId=[A-Za-z0-9_-]{1,128}$/.test(target) ? target : null;
}
