import { db } from "@/lib/db";
import { expertProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MarketplaceListing } from "@/types";

/** List all live expert profiles for the marketplace */
export function listLiveExperts(): MarketplaceListing[] {
  const profiles = db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.status, "live"))
    .all();

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

/** Get a single expert by profile ID for querying */
export function getExpertForQuery(profileId: string): {
  profile: typeof expertProfiles.$inferSelect;
  domains: string[];
} | null {
  const [profile] = db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1)
    .all();

  if (!profile?.adinAgentId) return null;

  return {
    profile,
    domains: JSON.parse(profile.domains ?? "[]") as string[],
  };
}
