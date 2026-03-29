import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import { getProfile, updateProfile } from "@/lib/services/profiles";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";

const AssessSchema = z.object({
  profileId: z.string().uuid(),
  domain: z.string().min(1),
  confidence: z.number().min(0).max(100),
  phase_completed: z.string().optional(),
});

/**
 * POST /api/expertise/tools/assess
 *
 * Updates confidence scores for a domain during interview.
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

  const parsed = AssessSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId, domain, confidence, phase_completed } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const profile = await getProfile(profileId);
  if (!profile) {
    return apiError("Profile not found", 404);
  }

  const currentMap: Record<string, number> = JSON.parse(
    profile.confidenceMap ?? "{}",
  );
  currentMap[domain] = confidence;

  const currentDomains: string[] = JSON.parse(profile.domains ?? "[]");
  if (!currentDomains.includes(domain)) {
    currentDomains.push(domain);
  }

  await updateProfile(profileId, {
    confidenceMap: JSON.stringify(currentMap),
    domains: JSON.stringify(currentDomains),
  });

  return apiSuccess({
    updated: true,
    confidenceMap: currentMap,
    domains: currentDomains,
    phase_completed: phase_completed ?? null,
  });
}
