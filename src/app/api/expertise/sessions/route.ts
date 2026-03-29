import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import {
  createSession as createExtractionSession,
  finalizeSession,
  getSessionsForProfile,
} from "@/lib/services/sessions";
import { apiError, apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";

const CreateSessionSchema = z.object({
  profileId: z.string().uuid(),
  realtimeSessionId: z.string().optional(),
});

const FinalizeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  durationSeconds: z.number().int().nonnegative().optional(),
  knowledgeItemsAdded: z.number().int().nonnegative().optional(),
  domainsCovered: z.array(z.string()).optional(),
  sessionSummary: z.string().optional(),
  transcript: z.string().optional(),
});

/**
 * POST /api/expertise/sessions — create a new extraction session.
 * GET  /api/expertise/sessions — list sessions for the authenticated profile.
 * PATCH /api/expertise/sessions — finalize a session with stats and transcript.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = CreateSessionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId, realtimeSessionId } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const sessionId = await createExtractionSession({ profileId, realtimeSessionId });
  return apiSuccess({ sessionId });
}

/**
 *
 * @param req
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  const profileId = req.nextUrl.searchParams.get("profileId");

  if (!profileId) {
    return apiError("profileId required", 400);
  }

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  try {
    const sessions = await getSessionsForProfile(profileId);

    return apiSuccess({
      sessions: sessions.map((s) => ({
        id: s.id,
        realtimeSessionId: s.realtimeSessionId,
        durationSeconds: s.durationSeconds,
        knowledgeItemsAdded: s.knowledgeItemsAdded,
        domainsCovered: JSON.parse(s.domainsCovered ?? "[]"),
        sessionSummary: s.sessionSummary,
        createdAt: s.createdAt,
      })),
    });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to fetch sessions");
  }
}

/**
 * PATCH to finalize a session with stats and transcript
 * @param req
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = FinalizeSessionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  try {
    await finalizeSession(parsed.data.sessionId, session.profileId, {
      durationSeconds: parsed.data.durationSeconds,
      knowledgeItemsAdded: parsed.data.knowledgeItemsAdded,
      domainsCovered: parsed.data.domainsCovered,
      sessionSummary: parsed.data.sessionSummary,
      transcript: parsed.data.transcript,
    });

    return apiSuccess({ finalized: true });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to finalize session");
  }
}
