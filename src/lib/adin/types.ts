import type { ModelMessage } from "ai";

// ---------------------------------------------------------------------------
// Task classification
// ---------------------------------------------------------------------------

/**
 *
 */
export type TaskComplexity =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "extensive"
  | "reasoning"
  | "code";

/**
 *
 */
export interface TaskBudget {
  complexity: TaskComplexity;
  initialSteps: number;
  maxSteps: number;
  shouldDelegate: boolean;
  classifierMethod: "regex" | "llm";
}

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------

/**
 *
 */
export type ModelTier =
  | "micro"
  | "fast"
  | "balanced"
  | "power"
  | "reasoning";

/**
 *
 */
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  tools: string[];
  modelTier: ModelTier;
  upgradeTier?: ModelTier | null;
  isCustom?: boolean;
}

// ---------------------------------------------------------------------------
// Tool context — passed through the tool factory and delegate chain
// ---------------------------------------------------------------------------

/**
 *
 */
export interface ToolContext {
  userId: string;
  conversationId: string;
  lastUserMessageText: string;
  taskBudget: TaskBudget;
}

// ---------------------------------------------------------------------------
// Chat API request / response
// ---------------------------------------------------------------------------

/**
 *
 */
export interface ChatRequest {
  messages: ModelMessage[];
  conversationId?: string;
  stream?: boolean;
  userId?: string;
}

/**
 *
 */
export interface ChatResponse {
  id: string;
  message: { role: "assistant"; content: string };
  toolCalls: Array<{ tool: string; args?: unknown }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ---------------------------------------------------------------------------
// Delegation result — returned by the delegate tool
// ---------------------------------------------------------------------------

/**
 *
 */
export interface DelegateResult {
  type: "delegate";
  agent: string;
  agentName: string;
  agentIcon: string;
  task: string;
  response: string;
  toolsUsed: string[];
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

/**
 *
 */
export type MemoryScope = "working" | "persistent";

/**
 *
 */
export interface MemoryEntry {
  id: string;
  userId: string;
  conversationId: string | null;
  scope: MemoryScope;
  key: string;
  content: string;
  reason: string | null;
  importance: number;
  category: string | null;
}
