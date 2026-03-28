import { generateText, stepCountIs, zodSchema, type ToolSet } from "ai";
import { z } from "zod";

import { getModelForTier } from "./models";
import { buildDelegationPrompt } from "./prompt";
import { getCustomAgentDefinitions } from "./custom-agents";
import type { AgentDefinition, DelegateResult, ToolContext } from "./types";

// ---------------------------------------------------------------------------
// Static agent registry — built-in agents that ship with the platform
// ---------------------------------------------------------------------------

export const STATIC_AGENTS: Record<string, AgentDefinition> = {
  researcher: {
    id: "researcher",
    name: "Researcher",
    description: "Deep web research, finding sources, synthesizing information from multiple sources",
    icon: "🔍",
    systemPrompt: `You are a research specialist. Your job is to find accurate, up-to-date information by searching the web and reading sources carefully.

When researching:
- Search for multiple perspectives on a topic
- Cite your sources with URLs when possible
- Distinguish between facts, expert opinions, and speculation
- If information conflicts between sources, note the disagreement
- Summarize findings clearly with key takeaways first`,
    tools: ["search_web", "fetch_url"],
    modelTier: "balanced",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    description: "Data analysis, comparisons, breaking down complex topics, pros/cons evaluation",
    icon: "📊",
    systemPrompt: `You are an analytical specialist. Your job is to break down complex topics, compare options, and provide structured analysis.

When analyzing:
- Use structured formats (tables, bullet points, numbered lists)
- Consider multiple dimensions and criteria
- Provide clear recommendations with reasoning
- Quantify when possible
- Acknowledge uncertainty and limitations in your analysis`,
    tools: ["search_web", "fetch_url"],
    modelTier: "power",
  },
  writer: {
    id: "writer",
    name: "Writer",
    description: "Content creation, editing, summarization, tone adaptation",
    icon: "✍️",
    systemPrompt: `You are a writing specialist. Your job is to create, edit, and refine written content.

When writing:
- Match the requested tone and style precisely
- Be concise by default — every word should earn its place
- Structure content for readability (headings, short paragraphs, lists)
- Adapt voice to audience (technical vs general, formal vs casual)`,
    tools: [],
    modelTier: "balanced",
  },
};

// ---------------------------------------------------------------------------
// Agent registry helpers
// ---------------------------------------------------------------------------

export function getAgentsList(
  customAgentDefs: Record<string, AgentDefinition> = {},
): Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  isCustom: boolean;
}> {
  const seen = new Set<string>();
  const result: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    isCustom: boolean;
  }> = [];

  for (const agent of Object.values(STATIC_AGENTS)) {
    if (seen.has(agent.id)) continue;
    seen.add(agent.id);
    result.push({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      isCustom: false,
    });
  }

  for (const agent of Object.values(customAgentDefs)) {
    if (seen.has(agent.id)) continue;
    seen.add(agent.id);
    result.push({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      isCustom: true,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Agent runner — execute a delegated task with a specific agent
// ---------------------------------------------------------------------------

const DELEGATION_TIMEOUT_MS = 60_000;
const MAX_DELEGATION_STEPS = 8;

export async function runAgent(
  agentDef: AgentDefinition,
  task: string,
  context?: string,
  agentTools?: ToolSet,
): Promise<DelegateResult> {
  const model = getModelForTier(agentDef.modelTier);
  const systemPrompt = buildDelegationPrompt(agentDef, task, context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELEGATION_TIMEOUT_MS);

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: task,
      tools: agentTools ?? {},
      stopWhen: stepCountIs(MAX_DELEGATION_STEPS),
      abortSignal: controller.signal,
    });

    const toolsUsed = result.steps
      .flatMap((s) => s.toolCalls.map((tc) => tc.toolName))
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      type: "delegate",
      agent: agentDef.id,
      agentName: agentDef.name,
      agentIcon: agentDef.icon,
      task,
      response: result.text,
      toolsUsed,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: "delegate",
      agent: agentDef.id,
      agentName: agentDef.name,
      agentIcon: agentDef.icon,
      task,
      response: "",
      toolsUsed: [],
      success: false,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Delegate tool — registered in the orchestrator's tool set
// ---------------------------------------------------------------------------

const delegateSchema = z.object({
  agent: z
    .string()
    .describe("Agent ID to delegate to (e.g. 'researcher', 'analyst', or a custom expert agent ID)"),
  task: z
    .string()
    .describe("Clear description of what you want the agent to do"),
  context: z
    .string()
    .optional()
    .describe("Relevant context, data, or previous findings to pass to the agent"),
});

export function createDelegateTool(
  toolContext: ToolContext,
  agentTools: ToolSet,
  customAgentDefs: Record<string, AgentDefinition>,
  description: string,
): ToolSet[string] {
  const allAgents: Record<string, AgentDefinition> = {
    ...STATIC_AGENTS,
    ...customAgentDefs,
  };

  return {
    description,
    inputSchema: zodSchema(delegateSchema),
    execute: async (args: z.infer<typeof delegateSchema>) => {
      let agentDef = allAgents[args.agent];

      if (!agentDef) {
        const fresh = getCustomAgentDefinitions(toolContext.userId);
        agentDef = fresh[args.agent];
        if (agentDef) allAgents[args.agent] = agentDef;
      }

      if (!agentDef) {
        return {
          type: "delegate",
          agent: args.agent,
          agentName: args.agent,
          agentIcon: "❓",
          task: args.task,
          response: "",
          toolsUsed: [],
          success: false,
          error: `Unknown agent: ${args.agent}. Available: ${Object.keys(allAgents).join(", ")}`,
        };
      }

      return runAgent(agentDef, args.task, args.context, agentTools);
    },
  } as ToolSet[string];
}
