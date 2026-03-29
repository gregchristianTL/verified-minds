/**
 * POST /api/swarm/intent -- posts a new intent into the DB-backed intent space.
 *
 * Body: { content: string, parentId?: string }
 * Returns: { data: { seq: number, intentId: string } }
 *
 * After persisting, fires-and-forgets a POST to /api/swarm/run to kick off
 * the orchestrator pipeline.
 */

import { type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { postMessage } from "@/lib/swarm/messageStore";
import {
  apiError,
  apiErrorFromCatch,
  apiSuccess,
} from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

const IntentSchema = z.object({
  content: z.string().min(1, "content is required"),
  parentId: z.string().optional(),
});

/**
 * Accept a new human intent and persist it to the swarm message log.
 * Browser-facing — no API key required. The orchestrator run route
 * handles its own auth server-to-server.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = IntentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const intentId = uuidv4();
  const parentId = parsed.data.parentId ?? "root";

  try {
    const seq = await postMessage({
      type: "INTENT",
      messageId: intentId,
      parentId,
      senderId: "human",
      payload: { content: parsed.data.content },
    });

    triggerOrchestrator(request, intentId, parsed.data.content);

    return apiSuccess({ seq, intentId });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to post intent");
  }
}

/**
 * Fire-and-forget POST to /api/swarm/run to start the orchestrator pipeline.
 * Errors are logged but don't affect the intent response.
 */
function triggerOrchestrator(
  request: NextRequest,
  intentId: string,
  content: string,
): void {
  const origin = request.nextUrl.origin;
  const apiKey = process.env.ADIN_API_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  fetch(`${origin}/api/swarm/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({ intentId, content }),
  }).catch((err: unknown) => {
    console.error(
      "[swarm/intent] Failed to trigger orchestrator:",
      err instanceof Error ? err.message : err,
    );
  });
}
