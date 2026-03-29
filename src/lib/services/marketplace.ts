import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { expertProfiles } from "@/lib/db/schema";
import type { MarketplaceListing } from "@/types";

/** List all live expert profiles for the marketplace */
export async function listLiveExperts(): Promise<MarketplaceListing[]> {
  const profiles = await db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.status, "live"));

  return profiles
    .filter((p) => p.adinAgentId)
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      bio: p.bio,
      domains: JSON.parse(p.domains ?? "[]") as string[],
      queryPrice: p.queryPrice ?? "0.05",
      adinAgentId: p.adinAgentId!,
    }));
}

/**
 * Get a single expert by profile ID for querying
 * @param profileId
 */
export async function getExpertForQuery(profileId: string): Promise<{
  profile: typeof expertProfiles.$inferSelect;
  domains: string[];
} | null> {
  const [profile] = await db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1);

  if (!profile?.adinAgentId) return null;

  return {
    profile,
    domains: JSON.parse(profile.domains ?? "[]") as string[],
  };
}
