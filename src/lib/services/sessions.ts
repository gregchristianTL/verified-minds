import { db } from "@/lib/db";
import { extractionSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateSessionInput {
  profileId: string;
  humeChatGroupId?: string | null;
}

/** Create a new extraction session */
export function createSession(input: CreateSessionInput): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(extractionSessions)
    .values({
      id,
      profileId: input.profileId,
      humeChatGroupId: input.humeChatGroupId ?? null,
      createdAt: now,
    })
    .run();

  return id;
}

/** Update session with final stats */
export function finalizeSession(
  sessionId: string,
  stats: {
    durationSeconds?: number;
    knowledgeItemsAdded?: number;
    domainsCovered?: string[];
    sessionSummary?: string;
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
