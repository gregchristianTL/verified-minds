import { NextRequest, NextResponse } from "next/server";
import { createSession, getSessionsForProfile } from "@/lib/services/sessions";

/** POST to create a new extraction session, GET to list sessions */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { profileId, realtimeSessionId } = body;

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  const sessionId = createSession({ profileId, realtimeSessionId });

  return NextResponse.json({ sessionId });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const profileId = req.nextUrl.searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    const sessions = getSessionsForProfile(profileId);

    return NextResponse.json({
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
