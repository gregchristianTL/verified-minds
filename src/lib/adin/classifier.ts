import { generateObject, zodSchema } from "ai";
import { z } from "zod";

import { getModel } from "./models";
import { STEP_BUDGETS } from "./models";
import type { TaskBudget, TaskComplexity } from "./types";

// ---------------------------------------------------------------------------
// Regex-based classification (fast fallback)
// ---------------------------------------------------------------------------

const COMPLEXITY_PATTERNS: Array<{ pattern: RegExp; complexity: TaskComplexity }> = [
  { pattern: /^(hi|hello|hey|thanks|ok|sure|yes|no|bye)\b/i, complexity: "trivial" },
  { pattern: /^(what is|who is|define|meaning of)\b/i, complexity: "simple" },
  { pattern: /\b(compare|contrast|analyze|evaluate|pros and cons)\b/i, complexity: "complex" },
  { pattern: /\b(step[- ]by[- ]step|detailed|comprehensive|in[- ]depth)\b/i, complexity: "extensive" },
  { pattern: /\b(code|implement|build|refactor|debug|fix the)\b/i, complexity: "code" },
  { pattern: /\b(reason|prove|derive|logic|why does)\b/i, complexity: "reasoning" },
  { pattern: /\b(how|explain|describe|tell me about)\b/i, complexity: "moderate" },
];

function classifyRegex(message: string): TaskComplexity {
  const trimmed = message.trim();
  if (trimmed.length < 10) return "trivial";
  if (trimmed.length > 500) return "complex";

  for (const { pattern, complexity } of COMPLEXITY_PATTERNS) {
    if (pattern.test(trimmed)) return complexity;
  }

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 5) return "simple";
  if (wordCount <= 20) return "moderate";
  return "complex";
}

// ---------------------------------------------------------------------------
// LLM-based classification (more accurate, single call)
// ---------------------------------------------------------------------------

const classificationSchema = z.object({
  complexity: z.enum([
    "trivial",
    "simple",
    "moderate",
    "complex",
    "extensive",
    "reasoning",
    "code",
  ]),
});

const CLASSIFY_TIMEOUT_MS = 3000;

async function classifyLLM(message: string): Promise<TaskComplexity | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);

  try {
    const { object } = await generateObject({
      model: getModel("gpt-4o-mini"),
      schema: zodSchema(classificationSchema),
      prompt: `Classify this user message's task complexity. Choose the most appropriate level:
- trivial: greetings, one-word responses, acknowledgements
- simple: basic factual questions, definitions, lookups
- moderate: "how to" questions, explanations, short descriptions
- complex: analysis, comparison, multi-part questions, strategy
- extensive: detailed research, comprehensive guides, multi-step plans
- reasoning: logic, proofs, mathematical derivation, "why" questions
- code: programming, implementation, debugging, technical architecture

USER MESSAGE:
${message.slice(0, 1000)}`,
      maxOutputTokens: 50,
      abortSignal: controller.signal,
    });
    return object.complexity;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Merged classifier — LLM with regex fallback
// ---------------------------------------------------------------------------

function mergeComplexity(a: TaskComplexity, b: TaskComplexity): TaskComplexity {
  const order: TaskComplexity[] = [
    "trivial", "simple", "moderate", "complex", "extensive", "reasoning", "code",
  ];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  return order[Math.max(ai, bi)];
}

export async function classifyTask(lastMessage: string): Promise<TaskBudget> {
  const regexComplexity = classifyRegex(lastMessage);

  const llmComplexity = await classifyLLM(lastMessage);

  const finalComplexity = llmComplexity
    ? mergeComplexity(llmComplexity, regexComplexity)
    : regexComplexity;

  const budget = STEP_BUDGETS[finalComplexity];

  return {
    complexity: finalComplexity,
    ...budget,
    shouldDelegate: finalComplexity !== "simple" && finalComplexity !== "trivial",
    classifierMethod: llmComplexity ? "llm" : "regex",
  };
}
