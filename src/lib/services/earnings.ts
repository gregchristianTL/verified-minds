import { db } from "@/lib/db";
import { expertEarnings, expertProfiles } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface RecordEarningInput {
  profileId: string;
  querySummary: string;
  domainTag: string | null;
  amount: number;
  txHash?: string | null;
}

/** Record a new earning and update the profile's total */
export function recordEarning(input: RecordEarningInput): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(expertEarnings)
    .values({
      id,
      profileId: input.profileId,
      querySummary: input.querySummary,
      domainTag: input.domainTag,
      amount: input.amount,
      txHash: input.txHash ?? null,
      createdAt: now,
    })
    .run();

  db.update(expertProfiles)
    .set({
      totalEarnings: sql`CAST(CAST(${expertProfiles.totalEarnings} AS REAL) + ${input.amount} AS TEXT)`,
    })
    .where(eq(expertProfiles.id, input.profileId))
    .run();

  return id;
}

/** Get earnings summary + recent transactions for a profile */
export function getEarningsForProfile(profileId: string): {
  totalEarnings: string;
  displayName: string;
  domains: string[];
  status: string | null;
  adinAgentId: string | null;
  transactions: (typeof expertEarnings.$inferSelect)[];
} | null {
  const [profile] = db
    .select()
    .from(expertProfiles)
    .where(eq(expertProfiles.id, profileId))
    .limit(1)
    .all();

  if (!profile) return null;

  const transactions = db
    .select()
    .from(expertEarnings)
    .where(eq(expertEarnings.profileId, profileId))
    .orderBy(desc(expertEarnings.createdAt))
    .limit(50)
    .all();

  return {
    totalEarnings: profile.totalEarnings ?? "0",
    displayName: profile.displayName,
    domains: JSON.parse(profile.domains ?? "[]"),
    status: profile.status,
    adinAgentId: profile.adinAgentId,
    transactions,
  };
}
