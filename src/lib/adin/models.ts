import { openai } from "@ai-sdk/openai";

import type { ModelTier, TaskComplexity } from "./types";

/**
 * Model tier map — OpenAI-only for now.
 * Swap to @ai-sdk/gateway with provider-prefixed IDs
 * (e.g. "anthropic/claude-sonnet-4") for multi-provider swarm.
 */
export const MODEL_TIERS: Record<ModelTier, string> = {
  micro: "gpt-4o-mini",
  fast: "gpt-4o-mini",
  balanced: "gpt-4o",
  power: "gpt-4o",
  reasoning: "o3-mini",
} as const;

/** Token budgets per complexity — controls max output length */
export const MAX_OUTPUT_TOKENS: Record<TaskComplexity, number> = {
  trivial: 1024,
  simple: 2048,
  moderate: 4096,
  complex: 8192,
  extensive: 16384,
  reasoning: 16384,
  code: 16384,
};

/** Step budgets per complexity — controls max tool-call iterations */
export const STEP_BUDGETS: Record<TaskComplexity, { initialSteps: number; maxSteps: number }> = {
  trivial: { initialSteps: 1, maxSteps: 2 },
  simple: { initialSteps: 2, maxSteps: 4 },
  moderate: { initialSteps: 4, maxSteps: 8 },
  complex: { initialSteps: 6, maxSteps: 12 },
  extensive: { initialSteps: 8, maxSteps: 16 },
  reasoning: { initialSteps: 8, maxSteps: 16 },
  code: { initialSteps: 6, maxSteps: 12 },
};

/**
 * Map task complexity to the right model tier
 * @param complexity
 */
export function getOrchestratorModel(complexity: TaskComplexity): string {
  switch (complexity) {
    case "trivial":
      return MODEL_TIERS.micro;
    case "simple":
      return MODEL_TIERS.fast;
    case "moderate":
      return MODEL_TIERS.balanced;
    case "complex":
    case "extensive":
      return MODEL_TIERS.power;
    case "reasoning":
    case "code":
      return MODEL_TIERS.reasoning;
    default:
      return MODEL_TIERS.balanced;
  }
}

/**
 * Get an AI SDK LanguageModel instance for the given model ID string
 * @param modelId
 */
export function getModel(modelId: string) {
  return openai(modelId);
}

/**
 * Get a model instance for a given tier
 * @param tier
 */
export function getModelForTier(tier: ModelTier) {
  return openai(MODEL_TIERS[tier]);
}
