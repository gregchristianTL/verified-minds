import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { expertProfiles,knowledgeItems } from "@/lib/db/schema";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";

const SaveKnowledgeSchema = z.object({
  profileId: z.string().uuid(),
  domain: z.string().min(1),
  topic: z.string().min(1),
  content: z.string().min(1),
  phase: z.string().min(1),
  sessionId: z.string().uuid().optional(),
});

/**
 * POST /api/expertise/tools/save-knowledge
 *
 * Saves a knowledge item extracted during interview.
 * Requires session; profileId must match the authenticated user.
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

  const parsed = SaveKnowledgeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId, domain, topic, content, phase, sessionId } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(knowledgeItems).values({
    id,
    profileId,
    sessionId: sessionId ?? null,
    domain,
    topic,
    content,
    phase,
    createdAt: now,
  });

  await db
    .update(expertProfiles)
    .set({
      knowledgeItemCount: sql`${expertProfiles.knowledgeItemCount} + 1`,
    })
    .where(eq(expertProfiles.id, profileId));

  return apiSuccess({ id, saved: true });
}
