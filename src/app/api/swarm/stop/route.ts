/**
 * POST /api/swarm/stop -- signals the swarm orchestrator to abort.
 *
 * Inserts a stop-flagged INTENT message into the swarm_messages table.
 * The orchestrator checks for stop messages between pipeline phases via
 * messageStore.isStopSignaled().
 *
 * Requires API key authentication in production.
 */

import { type NextRequest } from "next/server";

import { requireApiKey } from "@/lib/auth/apiKey";
import { postMessage } from "@/lib/swarm/messageStore";
import { apiErrorFromCatch, apiSuccess } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

/**
 * Accept a stop signal and persist it to the message log.
 *
 * @param req - incoming request (API key required in production)
 */
export async function POST(req: NextRequest): Promise<Response> {
  const authErr = requireApiKey(req);
  if (authErr) return authErr;

  const stoppedAt = Date.now();

  try {
    const seq = await postMessage({
      type: "INTENT",
      messageId: `stop-${stoppedAt}`,
      parentId: "root",
      senderId: "human",
      payload: { content: "STOP", isStop: true },
      timestamp: stoppedAt,
    });

    return apiSuccess({ ok: true, stoppedAt, seq });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to send stop signal");
  }
}
