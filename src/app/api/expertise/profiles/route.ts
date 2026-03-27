import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/services/profiles";

/** GET profile by profileId query param */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const profileId = req.nextUrl.searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  const profile = getProfile(profileId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
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
