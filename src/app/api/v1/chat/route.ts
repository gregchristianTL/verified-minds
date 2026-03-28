import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ModelMessage } from "ai";

import { chat, chatStream } from "@/lib/adin/client";

export const runtime = "nodejs";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/v1/chat — chat with the ADIN engine
// ---------------------------------------------------------------------------

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

/** Convert simple { role, content } to ModelMessage format */
function toModelMessages(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): ModelMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "text" as const, text: m.content }],
  }));
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
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

    return NextResponse.json({ data: response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/v1/chat] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
