import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  finalizeSession,
  getSessionsForProfile,
} from "@/lib/services/sessions";

/** POST to create a new extraction session, GET to list, PATCH to finalize */
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

/** PATCH to finalize a session with stats and transcript */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const {
    sessionId,
    durationSeconds,
    knowledgeItemsAdded,
    domainsCovered,
    sessionSummary,
    transcript,
  } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 },
    );
  }

  try {
    finalizeSession(sessionId, {
      durationSeconds,
      knowledgeItemsAdded,
      domainsCovered,
      sessionSummary,
      transcript,
    });

    return NextResponse.json({ finalized: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
