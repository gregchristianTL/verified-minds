import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { knowledgeItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProfile, updateProfile } from "@/lib/services/profiles";
import { buildAndPublishAgent } from "@/lib/adin/agent-factory";
import type { KnowledgeItem, DomainConfidence } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { profileId, name, domains, bio } = body;

  if (!profileId || !name || !domains?.length || !bio) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const profile = getProfile(profileId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const items = db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.profileId, profileId))
    .all();

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

    updateProfile(profileId, {
      adinAgentId: agentId,
      displayName: name,
      bio,
      domains: JSON.stringify(domains),
      status: "live",
    });

    return NextResponse.json({ agentId, status: "live" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create agent: ${message}` },
      { status: 500 },
    );
  }
}
