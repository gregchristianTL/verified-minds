import { db } from "@/lib/db";
import { verifiedUsers, expertProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface CreateProfileInput {
  worldIdHash: string;
  walletAddress?: string | null;
  verificationLevel?: string;
}

export interface ProfileResult {
  userId: string;
  profileId: string;
  profileStatus: string | null;
  isNew: boolean;
}

/** Find or create a verified user and their expert profile */
export function findOrCreateProfile(input: CreateProfileInput): ProfileResult {
  const [existing] = db
    .select()
    .from(verifiedUsers)
    .where(eq(verifiedUsers.worldIdHash, input.worldIdHash))
    .limit(1)
    .all();

  if (existing) {
    const [profile] = db
      .select()
      .from(expertProfiles)
      .where(eq(expertProfiles.userId, existing.id))
      .limit(1)
      .all();

    return {
      userId: existing.id,
      profileId: profile?.id ?? "",
      profileStatus: profile?.status ?? null,
      isNew: false,
    };
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(verifiedUsers)
    .values({
      id: userId,
      worldIdHash: input.worldIdHash,
      walletAddress: input.walletAddress ?? null,
      verificationLevel: input.verificationLevel ?? "device",
      createdAt: now,
    })
    .run();

  db.insert(expertProfiles)
    .values({
      id: profileId,
      userId,
      displayName: "Expert",
      status: "extracting",
      createdAt: now,
    })
    .run();

  return {
    userId,
    profileId,
    profileStatus: "extracting",
    isNew: true,
  };
}

/** Get a profile by ID */
export function getProfile(profileId: string): typeof expertProfiles.$inferSelect | null {
  const [profile] = db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1)
    .all();

  return profile ?? null;
}

/** Update profile fields */
export function updateProfile(
  profileId: string,
  updates: Partial<typeof expertProfiles.$inferInsert>,
): void {
  db.update(expertProfiles)
    .set(updates)
    .where(eq(expertProfiles.id, profileId))
    .run();
}
