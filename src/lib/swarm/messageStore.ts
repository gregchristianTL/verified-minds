/**
 * DB-backed message store for the Intent Space.
 * Replaces the external big-d TCP server with direct Neon queries.
 *
 * Every ITP message becomes a row in `swarm_messages`.
 * SSE stream polls this table; orchestrator reads/writes through these helpers.
 */

import { and, eq, gt, max, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { swarmMessages } from "@/lib/db/schema";
import type { ITPPayload, StoredMessage } from "./types";

interface PostMessageInput {
  type: string;
  messageId?: string;
  parentId: string;
  senderId: string;
  payload: ITPPayload;
  timestamp?: number;
}

/**
 * Insert a message into the swarm log.
 * Deduplicates INTENTs by messageId to prevent double-posts.
 *
 * @returns The assigned sequence number.
 */
export async function postMessage(msg: PostMessageInput): Promise<number> {
  const ts = msg.timestamp ?? Date.now();

  if (msg.type === "INTENT" && msg.messageId) {
    const existing = await db
      .select({ seq: swarmMessages.seq })
      .from(swarmMessages)
      .where(
        and(
          eq(swarmMessages.type, "INTENT"),
          eq(swarmMessages.messageId, msg.messageId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].seq;
    }
  }

  const rows = await db
    .insert(swarmMessages)
    .values({
      type: msg.type,
      messageId: msg.messageId ?? null,
      parentId: msg.parentId,
      senderId: msg.senderId,
      payload: JSON.stringify(msg.payload),
      timestamp: ts,
    })
    .returning({ seq: swarmMessages.seq });

  return rows[0].seq;
}

/**
 * Scan for messages in a given space (parentId) newer than `since`.
 * Equivalent to big-d's SCAN request.
 */
export async function scanMessages(
  spaceId: string,
  since = 0,
): Promise<StoredMessage[]> {
  const rows = await db
    .select()
    .from(swarmMessages)
    .where(
      and(eq(swarmMessages.parentId, spaceId), gt(swarmMessages.seq, since)),
    )
    .orderBy(swarmMessages.seq);

  return rows.map(rowToStoredMessage);
}

/**
 * Get all messages with seq > `since` across all spaces.
 * Used by the SSE stream to detect any new activity.
 */
export async function scanAllSince(since = 0): Promise<StoredMessage[]> {
  const rows = await db
    .select()
    .from(swarmMessages)
    .where(gt(swarmMessages.seq, since))
    .orderBy(swarmMessages.seq);

  return rows.map(rowToStoredMessage);
}

/**
 * Get the latest sequence number in the log.
 */
export async function getLatestSeq(): Promise<number> {
  const result = await db
    .select({ maxSeq: max(swarmMessages.seq) })
    .from(swarmMessages);

  return result[0]?.maxSeq ?? 0;
}

/**
 * Check whether a stop signal has been posted since `sinceTimestamp` (unix ms).
 * The orchestrator calls this between pipeline phases.
 */
export async function isStopSignaled(sinceTimestamp: number): Promise<boolean> {
  const rows = await db
    .select({ seq: swarmMessages.seq })
    .from(swarmMessages)
    .where(
      and(
        eq(swarmMessages.type, "INTENT"),
        gt(swarmMessages.timestamp, sinceTimestamp),
        sql`(${swarmMessages.payload}::jsonb ->> 'isStop')::boolean = true`,
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Map a database row to the StoredMessage shape the UI expects.
 */
function rowToStoredMessage(
  row: typeof swarmMessages.$inferSelect,
): StoredMessage {
  const parsed = safeParseJSON(row.payload);
  return {
    type: row.type,
    intentId: row.type === "INTENT" || row.type === "DECLINE" ? (row.messageId ?? undefined) : undefined,
    promiseId: row.type !== "INTENT" && row.type !== "DECLINE" ? (row.messageId ?? undefined) : undefined,
    parentId: row.parentId,
    senderId: row.senderId,
    payload: parsed,
    seq: row.seq,
    timestamp: row.timestamp,
  };
}

function safeParseJSON(str: string): ITPPayload {
  try {
    return JSON.parse(str) as ITPPayload;
  } catch {
    return {};
  }
}
