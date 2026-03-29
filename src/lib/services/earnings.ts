import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { expertEarnings, expertProfiles } from "@/lib/db/schema";

/**
 *
 */
export interface RecordEarningInput {
  profileId: string;
  querySummary: string;
  domainTag: string | null;
  amount: number;
  txHash?: string | null;
}

/**
 * Record a new earning and update the profile's total
 * @param input
 */
export async function recordEarning(input: RecordEarningInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(expertEarnings).values({
    id,
    profileId: input.profileId,
    querySummary: input.querySummary,
    domainTag: input.domainTag,
    amount: String(input.amount),
    txHash: input.txHash ?? null,
    createdAt: now,
  });

  await db
    .update(expertProfiles)
    .set({
      totalEarnings: sql`CAST(CAST(${expertProfiles.totalEarnings} AS NUMERIC) + ${input.amount} AS TEXT)`,
    })
    .where(eq(expertProfiles.id, input.profileId));

  return id;
}

/**
 * Get earnings summary + recent transactions for a profile
 * @param profileId
 */
export async function getEarningsForProfile(profileId: string): Promise<{
  totalEarnings: string;
  displayName: string;
  domains: string[];
  status: string | null;
  adinAgentId: string | null;
  transactions: (typeof expertEarnings.$inferSelect)[];
} | null> {
  const [profile] = await db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1);

  if (!profile) return null;

  const transactions = await db
    .select()
    .from(expertEarnings)
    .where(eq(expertEarnings.profileId, profileId))
    .orderBy(desc(expertEarnings.createdAt))
    .limit(50);

  return {
    totalEarnings: profile.totalEarnings ?? "0",
    displayName: profile.displayName,
    domains: JSON.parse(profile.domains ?? "[]"),
    status: profile.status,
    adinAgentId: profile.adinAgentId,
    transactions,
  };
}
