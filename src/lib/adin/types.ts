export interface AdinChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdinChatRequest {
  messages: AdinChatMessage[];
  conversationId?: string;
  stream?: boolean;
  workspace?: "personal" | "network";
}

export interface AdinChatResponse {
  text: string;
  conversationId: string;
}

export interface AdinCreateAgentRequest {
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  icon?: string;
  modelTier?: "fast" | "balanced" | "power" | "max";
}

export interface AdinCreateAgentResponse {
  agentId: string;
  name: string;
  description: string;
}

export interface AdinListAgentsResponse {
  agents: Array<{
    agentId: string;
    name: string;
    description: string;
    tools: string[];
    modelTier: string;
  }>;
}
