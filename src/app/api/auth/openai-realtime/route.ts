import { NextRequest, NextResponse } from "next/server";
import { buildProfilerPrompt } from "@/lib/openai/profiler-prompt";
import { PROFILER_TOOLS } from "@/lib/openai/tool-definitions";
import { getProfile } from "@/lib/services/profiles";
import { db } from "@/lib/db";
import { knowledgeItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/openai-realtime
 *
 * Unified-interface SDP handshake for OpenAI Realtime API.
 * The client sends its WebRTC SDP offer as the request body,
 * optionally with a profileId query param for resume context.
 * We combine it with the session config and forward to OpenAI.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const sdp = await req.text();
  if (!sdp) {
    return NextResponse.json({ error: "Missing SDP body" }, { status: 400 });
  }

  const profileId = req.nextUrl.searchParams.get("profileId") ?? "";
  const resumeContext = buildResumeContext(profileId);
  const instructions = buildProfilerPrompt(resumeContext ?? undefined);

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-4o-realtime-preview",
    voice: "coral",
    instructions,
    tools: PROFILER_TOOLS,
    tool_choice: "auto",
    input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
    turn_detection: { type: "server_vad" },
  });

  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", sessionConfig);

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[openai-realtime] SDP handshake failed:", errorText);
      return NextResponse.json(
        { error: "OpenAI session creation failed", details: errorText },
        { status: response.status },
      );
    }

    const answerSdp = await response.text();
    return new NextResponse(answerSdp, {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[openai-realtime] Error:", message);
    return NextResponse.json(
      { error: `Failed to create realtime session: ${message}` },
      { status: 500 },
    );
  }
}

/** Build resume context from DB if the profile has existing knowledge */
function buildResumeContext(profileId: string): {
  existingDomains: string[];
  existingConfidence: Record<string, number>;
  knowledgeCount: number;
  displayName: string;
} | null {
  if (!profileId) return null;

  try {
    const profile = getProfile(profileId);
    if (!profile) return null;

    const items = db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.profileId, profileId))
      .all();

    const domains: string[] = JSON.parse(profile.domains ?? "[]");
    const confidenceMap: Record<string, number> = JSON.parse(
      profile.confidenceMap ?? "{}",
    );

    return {
      existingDomains: domains,
      existingConfidence: confidenceMap,
      knowledgeCount: items.length,
      displayName: profile.displayName ?? "Expert",
    };
  } catch {
    return null;
  }
}
