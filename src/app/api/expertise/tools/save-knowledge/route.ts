import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeItems, expertProfiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { profileId, domain, topic, content, phase, sessionId } = body;

  if (!profileId || !domain || !topic || !content || !phase) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.insert(knowledgeItems).values({
    id,
    profileId,
    sessionId: sessionId ?? null,
    domain,
    topic,
    content,
    phase,
    createdAt: now,
  }).run();

  // Increment knowledge count on profile
  db.update(expertProfiles)
    .set({ knowledgeItemCount: sql`${expertProfiles.knowledgeItemCount} + 1` })
    .where(eq(expertProfiles.id, profileId))
    .run();

  return NextResponse.json({ id, saved: true });
}
