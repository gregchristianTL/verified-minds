import type { ModelMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { chat, chatStream } from "@/lib/adin/client";
import { requireApiKey } from "@/lib/auth/apiKey";
import { logger } from "@/lib/logger";
import { apiError, apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";
export const maxDuration = 300;

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  conversationId: z.string().uuid().optional(),
  stream: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

/**
 * Convert simple { role, content } to ModelMessage format
 * @param messages
 */
function toModelMessages(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): ModelMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "text" as const, text: m.content }],
  }));
}

/**
 * POST /api/v1/chat -- chat with the ADIN engine.
 * Requires API key authentication via Authorization header.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const authError = requireApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        errorCode: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
    }

    const { messages, conversationId, stream, userId } = parsed.data;
    const resolvedUserId =
      userId || req.headers.get("x-user-id") || "anonymous";
    const modelMessages = toModelMessages(messages);

    if (stream) {
      const result = await chatStream({
        messages: modelMessages,
        conversationId,
        stream: true,
        userId: resolvedUserId,
      });

      return result.toTextStreamResponse();
    }

    const response = await chat({
      messages: modelMessages,
      conversationId,
      stream: false,
      userId: resolvedUserId,
    });

    return apiSuccess(response);
  } catch (error: unknown) {
    logger.error("v1/chat error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return apiErrorFromCatch(error);
  }
}
