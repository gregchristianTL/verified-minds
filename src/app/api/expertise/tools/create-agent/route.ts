import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildAndPublishAgent } from "@/lib/adin/agent-factory";
import { isSession,requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { knowledgeItems } from "@/lib/db/schema";
import { getProfile, updateProfile } from "@/lib/services/profiles";
import { apiError, apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";
import type { DomainConfidence,KnowledgeItem } from "@/types";

const CreateAgentSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).max(100),
  domains: z.array(z.string().min(1)).min(1),
  bio: z.string().min(1).max(2000),
});

/**
 * POST /api/expertise/tools/create-agent
 *
 * Builds an expert agent from accumulated knowledge and publishes it.
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

  const parsed = CreateAgentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId, name, domains, bio } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const profile = await getProfile(profileId);
  if (!profile) {
    return apiError("Profile not found", 404);
  }

  const items = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.profileId, profileId));

  const typedItems: KnowledgeItem[] = items.map((i) => ({
    id: i.id,
    domain: i.domain,
    topic: i.topic,
    content: i.content,
    phase: i.phase as KnowledgeItem["phase"],
    createdAt: i.createdAt,
  }));

  const confidenceMap: Record<string, number> = JSON.parse(
    profile.confidenceMap ?? "{}",
  );
  const confidences: DomainConfidence[] = Object.entries(confidenceMap).map(
    ([domain, score]) => ({
      domain,
      level: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
      evidence: "",
      gaps: [],
    }),
  );

  try {
    const agentId = await buildAndPublishAgent({
      displayName: name,
      bio,
      domains,
      knowledgeItems: typedItems,
      confidences,
    });

    await updateProfile(profileId, {
      adinAgentId: agentId,
      displayName: name,
      bio,
      domains: JSON.stringify(domains),
      status: "live",
    });

    return apiSuccess({ agentId, status: "live" });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to create agent");
  }
}
