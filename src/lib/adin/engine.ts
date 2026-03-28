import { generateText, streamText, stepCountIs, type ModelMessage } from "ai";

import { classifyTask } from "./classifier";
import { getOrchestratorModel, getModel, MAX_OUTPUT_TOKENS } from "./models";
import { getCustomAgentDefinitions } from "./custom-agents";
import { getPersistentMemories } from "./memory";
import { saveConversation } from "./conversations";
import { assembleTools } from "./tools";
import { buildSystemPrompt } from "./prompt";
import type { ChatRequest, ChatResponse, ToolContext } from "./types";

// ---------------------------------------------------------------------------
// Main chat pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full ADIN chat pipeline:
 *
 * classify -> model select -> tools -> prompt -> generate -> persist
 */
export async function chat(
  request: ChatRequest,
): Promise<ChatResponse> {
  const userId = request.userId || "anonymous";
  const conversationId = request.conversationId || crypto.randomUUID();

  const lastUserMessage = [...request.messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastMessageText = extractText(lastUserMessage);

  const taskBudget = await classifyTask(lastMessageText);
  const modelId = getOrchestratorModel(taskBudget.complexity);

  const customAgentDefs = getCustomAgentDefinitions(userId);
  const persistentMemories = getPersistentMemories(userId);

  const toolContext: ToolContext = {
    userId,
    conversationId,
    lastUserMessageText: lastMessageText,
    taskBudget,
  };
  const tools = assembleTools(toolContext, customAgentDefs);

  const systemPrompt = buildSystemPrompt({
    userId,
    persistentMemories,
    currentRequest: lastMessageText,
    stepBudget: taskBudget.initialSteps,
    maxSteps: taskBudget.maxSteps,
    customAgents: customAgentDefs,
  });

  const result = await generateText({
    model: getModel(modelId),
    messages: request.messages,
    system: systemPrompt,
    tools,
    toolChoice: "auto",
    maxOutputTokens: MAX_OUTPUT_TOKENS[taskBudget.complexity],
    stopWhen: stepCountIs(taskBudget.maxSteps),
  });

  const allMessages: ModelMessage[] = [
    ...request.messages,
    { role: "assistant", content: [{ type: "text", text: result.text }] },
  ];

  try {
    saveConversation({ userId, conversationId, messages: allMessages });
  } catch (err) {
    console.error("[adin/engine] Failed to save conversation:", err);
  }

  const toolCalls = result.steps.flatMap((s) =>
    s.toolCalls.map((tc) => ({
      tool: tc.toolName,
      args: "args" in tc ? tc.args : undefined,
    })),
  );

  return {
    id: conversationId,
    message: { role: "assistant", content: result.text },
    toolCalls,
    usage: result.usage
      ? {
          promptTokens: result.usage.inputTokens ?? 0,
          completionTokens: result.usage.outputTokens ?? 0,
          totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
        }
      : undefined,
  };
}

/**
 * Streaming variant of the chat pipeline.
 */
export async function chatStream(
  request: ChatRequest,
) {
  const userId = request.userId || "anonymous";
  const conversationId = request.conversationId || crypto.randomUUID();

  const lastUserMessage = [...request.messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastMessageText = extractText(lastUserMessage);

  const taskBudget = await classifyTask(lastMessageText);
  const modelId = getOrchestratorModel(taskBudget.complexity);

  const customAgentDefs = getCustomAgentDefinitions(userId);
  const persistentMemories = getPersistentMemories(userId);

  const toolContext: ToolContext = {
    userId,
    conversationId,
    lastUserMessageText: lastMessageText,
    taskBudget,
  };
  const tools = assembleTools(toolContext, customAgentDefs);

  const systemPrompt = buildSystemPrompt({
    userId,
    persistentMemories,
    currentRequest: lastMessageText,
    stepBudget: taskBudget.initialSteps,
    maxSteps: taskBudget.maxSteps,
    customAgents: customAgentDefs,
  });

  const result = streamText({
    model: getModel(modelId),
    messages: request.messages,
    system: systemPrompt,
    tools,
    toolChoice: "auto",
    maxOutputTokens: MAX_OUTPUT_TOKENS[taskBudget.complexity],
    stopWhen: stepCountIs(taskBudget.maxSteps),
    async onFinish({ text }) {
      try {
        const allMessages: ModelMessage[] = [
          ...request.messages,
          { role: "assistant", content: [{ type: "text", text }] },
        ];
        saveConversation({ userId, conversationId, messages: allMessages });
      } catch (err) {
        console.error("[adin/engine] Failed to save conversation:", err);
      }
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(message: ModelMessage | undefined): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");
  }
  return "";
}
