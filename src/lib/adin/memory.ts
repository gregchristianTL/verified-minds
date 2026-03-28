import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentMemory } from "@/lib/db/schema";

import type { MemoryEntry, MemoryScope } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaveMemoryParams {
  userId: string;
  conversationId?: string | null;
  scope: MemoryScope;
  key: string;
  content: string;
  reason?: string;
  importance?: number;
  category?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MemoryRow = typeof agentMemory.$inferSelect;

function toMemoryEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    userId: row.userId,
    conversationId: row.conversationId,
    scope: row.scope as MemoryScope,
    key: row.key,
    content: row.content,
    reason: row.reason,
    importance: row.importance,
    category: row.category,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** Upsert a memory entry — if key+scope+user+conversation exists, update content */
export function saveMemory(params: SaveMemoryParams): MemoryEntry {
  const now = new Date().toISOString();
  const conversationId = params.conversationId ?? null;

  const existing = db
    .select()
    .from(agentMemory)
    .where(
      and(
        eq(agentMemory.userId, params.userId),
        eq(agentMemory.scope, params.scope),
        eq(agentMemory.key, params.key),
        conversationId
          ? eq(agentMemory.conversationId, conversationId)
          : isNull(agentMemory.conversationId),
      ),
    )
    .limit(1)
    .all();

  if (existing.length > 0) {
    db.update(agentMemory)
      .set({
        content: params.content,
        reason: params.reason ?? existing[0].reason,
        importance: params.importance ?? existing[0].importance,
        category: params.category ?? existing[0].category,
        updatedAt: now,
      })
      .where(eq(agentMemory.id, existing[0].id))
      .run();

    return toMemoryEntry({ ...existing[0], content: params.content, updatedAt: now });
  }

  const id = crypto.randomUUID();
  const row = {
    id,
    userId: params.userId,
    conversationId,
    scope: params.scope,
    key: params.key,
    content: params.content,
    reason: params.reason ?? null,
    importance: params.importance ?? 3,
    category: params.category ?? null,
    expiresAt: params.scope === "working"
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(agentMemory).values(row).run();
  return toMemoryEntry(row);
}

/** Retrieve all persistent memories for a user */
export function getPersistentMemories(
  userId: string,
): Array<{ key: string; content: string }> {
  const rows = db
    .select({ key: agentMemory.key, content: agentMemory.content })
    .from(agentMemory)
    .where(
      and(
        eq(agentMemory.userId, userId),
        eq(agentMemory.scope, "persistent"),
      ),
    )
    .all();

  return rows;
}

/** Retrieve working memories for a specific conversation */
export function getWorkingMemories(
  userId: string,
  conversationId: string,
): Array<{ key: string; content: string }> {
  return db
    .select({ key: agentMemory.key, content: agentMemory.content })
    .from(agentMemory)
    .where(
      and(
        eq(agentMemory.userId, userId),
        eq(agentMemory.conversationId, conversationId),
        eq(agentMemory.scope, "working"),
      ),
    )
    .all();
}

/** Delete a specific memory by key */
export function forgetMemory(
  userId: string,
  key: string,
  scope: MemoryScope = "persistent",
): boolean {
  const result = db
    .delete(agentMemory)
    .where(
      and(
        eq(agentMemory.userId, userId),
        eq(agentMemory.scope, scope),
        eq(agentMemory.key, key),
      ),
    )
    .run();

  return result.changes > 0;
}
