import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createExpertAgent, listAgents } from "@/lib/adin/client";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/v1/agents — list all available agents
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = req.headers.get("x-user-id") ?? undefined;
    const result = await listAgents(userId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/agents — create a custom agent
// ---------------------------------------------------------------------------

const CreateAgentSchema = z.object({
  agentId: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  systemPrompt: z.string().min(1).max(10000),
  tools: z.array(z.string()).min(0).max(20),
  icon: z.string().optional(),
  modelTier: z
    .enum(["fast", "balanced", "power", "max"])
    .optional()
    .default("balanced"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = CreateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createExpertAgent(parsed.data);

    return NextResponse.json(
      { data: { agent: result } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
