/**
 * POST /api/swarm/run -- triggers the full swarm orchestrator pipeline.
 *
 * Receives { intentId, content } and runs the recursive three-phase pipeline
 * (explore -> critique -> synthesize). All progress is written to
 * swarm_messages via the messageStore; the SSE stream picks them up.
 *
 * Designed to be fired-and-forgotten from /api/swarm/intent.
 * Uses maxDuration=300 (5 min) for Vercel Pro tier.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiKey } from "@/lib/auth/apiKey";
import { runPipeline } from "@/lib/swarm/orchestrator";
import {
  apiError,
  apiErrorFromCatch,
  apiSuccess,
} from "@/lib/utils/apiResponse";

export const runtime = "nodejs";
export const maxDuration = 300;

const RunSchema = z.object({
  intentId: z.string().min(1),
  content: z.string().min(1),
});

/**
 * Execute the swarm pipeline for a given intent.
 *
 * @param request - incoming request with intentId and content
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authErr = requireApiKey(request);
  if (authErr) return authErr;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = RunSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { intentId, content } = parsed.data;
  const startedAt = Date.now();

  try {
    const result = await runPipeline(intentId, content, 0, startedAt);
    return apiSuccess({
      intentId,
      completed: true,
      deliverableLength: result.deliverable.length,
      workItems: result.completedWork.length,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Pipeline failed");
  }
}
