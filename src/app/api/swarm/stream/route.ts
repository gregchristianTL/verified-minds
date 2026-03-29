/**
 * SSE stream: polls the swarm_messages table and pushes new messages
 * to the browser as Server-Sent Events.
 *
 * GET /api/swarm/stream?since=0
 *
 * Replaces the former TCP bridge with a DB polling loop (~1 s interval).
 */

import {
  getLatestSeq,
  scanAllSince,
  scanMessages,
} from "@/lib/swarm/messageStore";
import type { StoredMessage } from "@/lib/swarm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POLL_INTERVAL_MS = 1000;
const SERVICE_SENDER = "intent-space";
const NON_HUMAN_SENDERS = new Set([SERVICE_SENDER, "swarm-orchestrator"]);

/**
 * Stream swarm messages to the client via SSE.
 *
 * @param request - the incoming GET request
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sinceParam = parseInt(url.searchParams.get("since") ?? "0", 10);

  const encoder = new TextEncoder();
  let closed = false;
  let cursor = sinceParam;

  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = (event: string, data: unknown): void => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      request.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });

      sendSSE("connected", { source: "neon-db" });

      try {
        const rootMessages = await scanMessages("root", 0);
        const filtered = rootMessages.filter(
          (m) => m.senderId !== SERVICE_SENDER,
        );
        const latestSeq = await getLatestSeq();

        sendSSE("scan_result", {
          type: "SCAN_RESULT",
          spaceId: "root",
          messages: filtered,
          latestSeq,
        });

        if (latestSeq > cursor) cursor = latestSeq;

        const humanIntents = filtered.filter(
          (m) =>
            m.type === "INTENT" &&
            m.intentId &&
            !NON_HUMAN_SENDERS.has(m.senderId),
        );
        const latestIntent = humanIntents.at(-1);

        if (latestIntent?.intentId) {
          await emitSubSpaceScan(latestIntent.intentId, sendSSE);
        }
      } catch (err: unknown) {
        sendSSE("error", {
          message:
            err instanceof Error ? err.message : "Failed initial scan",
        });
      }

      while (!closed) {
        await sleep(POLL_INTERVAL_MS);
        if (closed) break;

        try {
          const newMessages = await scanAllSince(cursor);
          if (newMessages.length === 0) continue;

          cursor = newMessages[newMessages.length - 1].seq;

          const filtered = newMessages.filter(
            (m) => m.senderId !== SERVICE_SENDER,
          );

          for (const msg of filtered) {
            sendSSE("message", msg);
          }

          const newIntents = filtered.filter(
            (m) => m.type === "INTENT" && m.intentId,
          );
          for (const intent of newIntents) {
            if (intent.intentId) {
              await emitSubSpaceScan(intent.intentId, sendSSE);
            }
          }
        } catch (err: unknown) {
          sendSSE("error", {
            message:
              err instanceof Error ? err.message : "Poll error",
          });
        }
      }

      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * Scan a sub-space (child of a human intent) and emit its messages
 * as a SCAN_RESULT SSE event.
 */
async function emitSubSpaceScan(
  spaceId: string,
  sendSSE: (event: string, data: unknown) => void,
): Promise<void> {
  const messages = await scanMessages(spaceId, 0);
  const filtered = messages.filter(
    (m: StoredMessage) => m.senderId !== SERVICE_SENDER,
  );
  const latestSeq =
    messages.length > 0 ? messages[messages.length - 1].seq : 0;

  sendSSE("scan_result", {
    type: "SCAN_RESULT",
    spaceId,
    messages: filtered,
    latestSeq,
  });

  for (const m of filtered) {
    if (m.type === "INTENT" && m.intentId) {
      await emitSubSpaceScan(m.intentId, sendSSE);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
