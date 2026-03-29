import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/services/profiles";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { profileId, domain, confidence, phase_completed } = body;

  if (!profileId || !domain || confidence === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const profile = getProfile(profileId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const currentMap: Record<string, number> = JSON.parse(
    profile.confidenceMap ?? "{}",
  );
  currentMap[domain] = confidence;

  const currentDomains: string[] = JSON.parse(profile.domains ?? "[]");
  if (!currentDomains.includes(domain)) {
    currentDomains.push(domain);
  }

  updateProfile(profileId, {
    confidenceMap: JSON.stringify(currentMap),
    domains: JSON.stringify(currentDomains),
  });

  return NextResponse.json({
    updated: true,
    confidenceMap: currentMap,
    domains: currentDomains,
    phase_completed: phase_completed ?? null,
  });
}
