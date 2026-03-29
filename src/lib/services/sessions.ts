import { db } from "@/lib/db";
import { extractionSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateSessionInput {
  profileId: string;
  realtimeSessionId?: string | null;
}

/** Create a new extraction session */
export function createSession(input: CreateSessionInput): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(extractionSessions)
    .values({
      id,
      profileId: input.profileId,
      realtimeSessionId: input.realtimeSessionId ?? null,
      createdAt: now,
    })
    .run();

  return id;
}

/** Update session with final stats and optional transcript */
export function finalizeSession(
  sessionId: string,
  stats: {
    durationSeconds?: number;
    knowledgeItemsAdded?: number;
    domainsCovered?: string[];
    sessionSummary?: string;
    transcript?: string;
  },
): void {
  db.update(extractionSessions)
    .set({
      durationSeconds: stats.durationSeconds,
      knowledgeItemsAdded: stats.knowledgeItemsAdded,
      domainsCovered: stats.domainsCovered
        ? JSON.stringify(stats.domainsCovered)
        : undefined,
      sessionSummary: stats.sessionSummary,
      transcript: stats.transcript,
    })
    .where(eq(extractionSessions.id, sessionId))
    .run();
}

/** Get sessions for a profile, most recent first */
export function getSessionsForProfile(
  profileId: string,
): (typeof extractionSessions.$inferSelect)[] {
  return db
    .select()
    .from(extractionSessions)
    .where(eq(extractionSessions.profileId, profileId))
    .orderBy(desc(extractionSessions.createdAt))
    .all();
}
