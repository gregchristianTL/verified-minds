import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { extractionSessions } from "@/lib/db/schema";

/**
 *
 */
export interface CreateSessionInput {
  profileId: string;
  realtimeSessionId?: string | null;
}

/**
 * Create a new extraction session
 * @param input
 */
export async function createSession(input: CreateSessionInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(extractionSessions).values({
    id,
    profileId: input.profileId,
    realtimeSessionId: input.realtimeSessionId ?? null,
    createdAt: now,
  });

  return id;
}

/**
 * Update session with final stats and optional transcript.
 * Scoped to the owner's profileId to prevent IDOR.
 *
 * @param sessionId - the extraction session to finalize
 * @param profileId - must match the session's owning profile
 * @param stats - finalization payload
 * @param stats.durationSeconds
 * @param stats.knowledgeItemsAdded
 * @param stats.domainsCovered
 * @param stats.sessionSummary
 * @param stats.transcript
 */
export async function finalizeSession(
  sessionId: string,
  profileId: string,
  stats: {
    durationSeconds?: number;
    knowledgeItemsAdded?: number;
    domainsCovered?: string[];
    sessionSummary?: string;
    transcript?: string;
  },
): Promise<void> {
  await db
    .update(extractionSessions)
    .set({
      durationSeconds: stats.durationSeconds,
      knowledgeItemsAdded: stats.knowledgeItemsAdded,
      domainsCovered: stats.domainsCovered
        ? JSON.stringify(stats.domainsCovered)
        : undefined,
      sessionSummary: stats.sessionSummary,
      transcript: stats.transcript,
    })
    .where(
      and(
        eq(extractionSessions.id, sessionId),
        eq(extractionSessions.profileId, profileId),
      ),
    );
}

/**
 * Get sessions for a profile, most recent first
 * @param profileId
 */
export async function getSessionsForProfile(
  profileId: string,
): Promise<(typeof extractionSessions.$inferSelect)[]> {
  return db
    .select()
    .from(extractionSessions)
    .where(eq(extractionSessions.profileId, profileId))
    .orderBy(desc(extractionSessions.createdAt));
}
