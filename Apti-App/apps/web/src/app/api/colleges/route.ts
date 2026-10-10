import { getSessionAccess } from "@/lib/auth";
import { database } from "@/lib/database";
import { createHomeCollegeHandlers } from "@/lib/home-college";

export const { GET } = createHomeCollegeHandlers({ database, getSessionAccess });
