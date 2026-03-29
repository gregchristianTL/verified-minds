import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import { getProfile } from "@/lib/services/profiles";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";

const QuerySchema = z.object({
  profileId: z.string().uuid(),
});

/**
 * GET /api/expertise/profiles?profileId=...
 *
 * Returns the authenticated user's profile. The profileId query param
 * must match the session's profileId to prevent IDOR.
 * @param req
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  const parsed = QuerySchema.safeParse({
    profileId: req.nextUrl.searchParams.get("profileId"),
  });

  if (!parsed.success) {
    return apiError("profileId required (UUID)", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const profile = await getProfile(profileId);

  if (!profile) {
    return apiError("Profile not found", 404);
  }

  return apiSuccess({
    id: profile.id,
    displayName: profile.displayName,
    bio: profile.bio,
    domains: JSON.parse(profile.domains ?? "[]"),
    confidenceMap: JSON.parse(profile.confidenceMap ?? "{}"),
    knowledgeItemCount: profile.knowledgeItemCount,
    adinAgentId: profile.adinAgentId,
    status: profile.status,
    queryPrice: profile.queryPrice,
    totalEarnings: profile.totalEarnings,
    createdAt: profile.createdAt,
  });
}
