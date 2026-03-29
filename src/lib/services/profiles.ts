import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { expertProfiles,verifiedUsers } from "@/lib/db/schema";

/**
 *
 */
export interface CreateProfileInput {
  worldIdHash: string;
  walletAddress?: string | null;
  verificationLevel?: string;
}

/**
 *
 */
export interface ProfileResult {
  userId: string;
  profileId: string;
  profileStatus: string | null;
  knowledgeItemCount: number;
  isNew: boolean;
}

/**
 * Find or create a verified user and their expert profile
 * @param input
 */
export async function findOrCreateProfile(
  input: CreateProfileInput,
): Promise<ProfileResult> {
  const [existing] = await db
    .select()
    .from(verifiedUsers)
    .where(eq(verifiedUsers.worldIdHash, input.worldIdHash))
    .limit(1);

  if (existing) {
    const [profile] = await db
      .select()
      .from(expertProfiles)
      .where(eq(expertProfiles.userId, existing.id))
      .limit(1);

    return {
      userId: existing.id,
      profileId: profile?.id ?? "",
      profileStatus: profile?.status ?? null,
      knowledgeItemCount: profile?.knowledgeItemCount ?? 0,
      isNew: false,
    };
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(verifiedUsers).values({
    id: userId,
    worldIdHash: input.worldIdHash,
    walletAddress: input.walletAddress ?? null,
    verificationLevel: input.verificationLevel ?? "device",
    createdAt: now,
  });

  await db.insert(expertProfiles).values({
    id: profileId,
    userId,
    displayName: "Expert",
    status: "extracting",
    createdAt: now,
  });

  return {
    userId,
    profileId,
    profileStatus: "extracting",
    knowledgeItemCount: 0,
    isNew: true,
  };
}

/**
 * Get a profile by ID
 * @param profileId
 */
export async function getProfile(
  profileId: string,
): Promise<typeof expertProfiles.$inferSelect | null> {
  const [profile] = await db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1);

  return profile ?? null;
}

/**
 * Update profile fields
 * @param profileId
 * @param updates
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<typeof expertProfiles.$inferInsert>,
): Promise<void> {
  await db
    .update(expertProfiles)
    .set(updates)
    .where(eq(expertProfiles.id, profileId));
}
