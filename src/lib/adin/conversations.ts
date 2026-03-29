import type { ModelMessage } from "ai";
import { and, desc,eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { adinConversations } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 *
 */
export interface Conversation {
  id: string;
  userId: string;
  messages: ModelMessage[];
  messageCount: number;
  title: string | null;
  metadata: Record<string, unknown>;
  lastMessageAt: string | null;
  createdAt: string;
}

/**
 *
 */
interface SaveConversationParams {
  userId: string;
  conversationId: string;
  messages: ModelMessage[];
  title?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 *
 * @param params
 */
export async function saveConversation(params: SaveConversationParams): Promise<Conversation> {
  const now = new Date().toISOString();
  const messagesJson = JSON.stringify(params.messages);
  const messageCount = params.messages.length;
  const metadataJson = JSON.stringify(params.metadata || {});

  const existing = await db
    .select({ id: adinConversations.id })
    .from(adinConversations)
    .where(
      and(
        eq(adinConversations.id, params.conversationId),
        eq(adinConversations.userId, params.userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(adinConversations)
      .set({
        messages: messagesJson,
        messageCount,
        title: params.title ?? undefined,
        metadata: metadataJson,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(adinConversations.id, params.conversationId));
  } else {
    await db.insert(adinConversations).values({
      id: params.conversationId,
      userId: params.userId,
      messages: messagesJson,
      messageCount,
      title: params.title ?? null,
      metadata: metadataJson,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    id: params.conversationId,
    userId: params.userId,
    messages: params.messages,
    messageCount,
    title: params.title ?? null,
    metadata: params.metadata || {},
    lastMessageAt: now,
    createdAt: now,
  };
}

/**
 *
 * @param conversationId
 * @param userId
 */
export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const [row] = await db
    .select()
    .from(adinConversations)
    .where(
      and(
        eq(adinConversations.id, conversationId),
        eq(adinConversations.userId, userId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    messages: JSON.parse(row.messages || "[]") as ModelMessage[],
    messageCount: row.messageCount,
    title: row.title,
    metadata: JSON.parse(row.metadata || "{}") as Record<string, unknown>,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
  };
}

/**
 *
 * @param userId
 * @param limit
 * @param offset
 */
export async function listConversations(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<Array<Omit<Conversation, "messages">>> {
  const rows = await db
    .select({
      id: adinConversations.id,
      userId: adinConversations.userId,
      messageCount: adinConversations.messageCount,
      title: adinConversations.title,
      metadata: adinConversations.metadata,
      lastMessageAt: adinConversations.lastMessageAt,
      createdAt: adinConversations.createdAt,
    })
    .from(adinConversations)
    .where(eq(adinConversations.userId, userId))
    .orderBy(desc(adinConversations.lastMessageAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    messageCount: r.messageCount,
    title: r.title,
    metadata: JSON.parse(r.metadata || "{}") as Record<string, unknown>,
    lastMessageAt: r.lastMessageAt,
    createdAt: r.createdAt,
  }));
}
