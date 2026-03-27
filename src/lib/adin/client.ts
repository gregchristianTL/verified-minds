/**
 * ADIN v1 API Client
 *
 * Calls the deployed adin-chat instance for:
 * - Creating custom agents (expert sub-agents)
 * - Querying expert agents via chat (with delegation)
 * - Listing agents on the marketplace
 */

const ADIN_API_URL = process.env.ADIN_API_URL ?? "http://localhost:3001";
const ADIN_WALLET = process.env.ADIN_WALLET_ADDRESS ?? "";

interface CreateAgentParams {
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  modelTier?: "fast" | "balanced" | "power" | "max";
}

interface ChatParams {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationId?: string;
  stream?: boolean;
}

interface AdinAgent {
  agentId: string;
  name: string;
  description: string;
  tools: string[];
  modelTier: string;
}

async function adinFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ADIN_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-payer-address": ADIN_WALLET,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ADIN API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function createExpertAgent(
  params: CreateAgentParams,
): Promise<{ agentId: string }> {
  return adinFetch("/api/v1/agents", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function queryExpertAgent(
  params: ChatParams,
): Promise<{ text: string; conversationId: string }> {
  return adinFetch("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({
      ...params,
      stream: false,
    }),
  });
}

export async function listAgents(): Promise<{ agents: AdinAgent[] }> {
  return adinFetch("/api/v1/agents");
}
