import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { isSession,requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { knowledgeItems } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { buildProfilerPrompt } from "@/lib/openai/profiler-prompt";
import { PROFILER_TOOLS } from "@/lib/openai/tool-definitions";
import { getProfile } from "@/lib/services/profiles";
import { apiError } from "@/lib/utils/apiResponse";

/**
 * POST /api/auth/openai-realtime
 *
 * SDP handshake for OpenAI Realtime API. Requires a valid session.
 * The optional profileId query param must match the session's profile
 * to prevent leaking another user's knowledge into the session.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return apiError("OPENAI_API_KEY not configured", 500);
  }

  const sdp = await req.text();
  if (!sdp) {
    return apiError("Missing SDP body", 400);
  }

  const profileId = req.nextUrl.searchParams.get("profileId") ?? "";

  if (profileId && profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const useProfileId = profileId || session.profileId;
  const resumeContext = await buildResumeContext(useProfileId);
  const instructions = buildProfilerPrompt(resumeContext ?? undefined);

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime",
    instructions,
    audio: { output: { voice: "coral" } },
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
      logger.error("SDP handshake failed", { details: errorText });
      return apiError("OpenAI session creation failed", response.status, {
        details: errorText,
      });
    }

    const answerSdp = await response.text();

    return NextResponse.json({
      sdp: answerSdp,
      sessionUpdate: {
        type: "session.update",
        session: {
          type: "realtime",
          input_audio_transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
          tools: PROFILER_TOOLS,
          tool_choice: "auto",
          turn_detection: { type: "semantic_vad" },
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Realtime session creation failed", { error: message });
    return apiError(`Failed to create realtime session: ${message}`, 500);
  }
}

/**
 * Build resume context from DB if the profile has existing knowledge
 * @param profileId
 */
async function buildResumeContext(profileId: string): Promise<{
  existingDomains: string[];
  existingConfidence: Record<string, number>;
  knowledgeCount: number;
  displayName: string;
} | null> {
  if (!profileId) return null;

  try {
    const profile = await getProfile(profileId);
    if (!profile) return null;

    const items = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.profileId, profileId));

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
