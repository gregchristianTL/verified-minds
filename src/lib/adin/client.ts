/**
 * ADIN Engine Client
 *
 * Local engine interface — replaces the previous HTTP client that called
 * an external adin-chat instance. All operations now run in-process against
 * the embedded engine, SQLite DB, and AI SDK.
 */

import type { ModelMessage } from "ai";

import { chat } from "./engine";
import {
  createCustomAgent as dbCreateAgent,
} from "./custom-agents";
import { getCustomAgentDefinitions } from "./custom-agents";
import { getAgentsList } from "./agents";

// ---------------------------------------------------------------------------
// Create an expert agent (stored locally)
// ---------------------------------------------------------------------------

interface CreateAgentParams {
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  modelTier?: "fast" | "balanced" | "power" | "max";
}

export async function createExpertAgent(
  params: CreateAgentParams,
): Promise<{ agentId: string }> {
  const tier = params.modelTier === "max" ? "power" : (params.modelTier ?? "balanced");

  const result = await dbCreateAgent({
    agentId: params.agentId,
    name: params.name,
    description: params.description,
    systemPrompt: params.systemPrompt,
    tools: params.tools,
    modelTier: tier,
    createdBy: "api",
  });

  if ("error" in result) {
    throw new Error(result.error);
  }

  return { agentId: result.agent.id };
}

// ---------------------------------------------------------------------------
// Query an expert agent via the chat engine
// ---------------------------------------------------------------------------

interface ChatParams {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationId?: string;
  stream?: boolean;
  userId?: string;
}

export async function queryExpertAgent(
  params: ChatParams,
): Promise<{ text: string; conversationId: string }> {
  // Convert simple messages to ModelMessage format
  const modelMessages: ModelMessage[] = params.messages.map((m) => ({
    role: m.role,
    content: [{ type: "text" as const, text: m.content }],
  }));

  const response = await chat({
    messages: modelMessages,
    conversationId: params.conversationId,
    stream: false,
    userId: params.userId,
  });

  return {
    text: response.message.content,
    conversationId: response.id,
  };
}

// ---------------------------------------------------------------------------
// List all agents (static + custom)
// ---------------------------------------------------------------------------

interface AdinAgent {
  agentId: string;
  name: string;
  description: string;
  icon: string;
  isCustom: boolean;
}

export async function listAgents(userId?: string): Promise<{ agents: AdinAgent[] }> {
  const customDefs = getCustomAgentDefinitions(userId);
  const list = getAgentsList(customDefs);

  return {
    agents: list.map((a) => ({
      agentId: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      isCustom: a.isCustom,
    })),
  };
}

// Re-export engine for direct use
export { chat, chatStream } from "./engine";
export type { ChatRequest, ChatResponse } from "./types";
