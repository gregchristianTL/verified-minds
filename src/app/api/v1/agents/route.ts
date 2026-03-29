import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createExpertAgent, listAgents } from "@/lib/adin/client";
import { requireApiKey } from "@/lib/auth/apiKey";
import { apiError, apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

/**
 * GET /api/v1/agents -- list all available agents.
 * Requires API key authentication.
 * @param req
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const userId = req.headers.get("x-user-id") ?? undefined;
    const result = await listAgents(userId);
    return apiSuccess(result);
  } catch (error: unknown) {
    return apiErrorFromCatch(error);
  }
}

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

/**
 * POST /api/v1/agents -- create a custom agent.
 * Requires API key authentication.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = CreateAgentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        errorCode: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    const result = await createExpertAgent(parsed.data);
    return apiSuccess({ agent: result }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("already exists")) {
      return apiError(message, 409);
    }

    return apiErrorFromCatch(error);
  }
}
