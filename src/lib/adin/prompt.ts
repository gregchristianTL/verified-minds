import type { AgentDefinition } from "./types";

/**
 * Build the orchestrator system prompt.
 *
 * This is the "brain" prompt sent to the top-level model that decides
 * whether to answer directly or delegate to a specialist agent.
 * @param context
 * @param context.userId
 * @param context.persistentMemories
 * @param context.currentRequest
 * @param context.stepBudget
 * @param context.maxSteps
 * @param context.customAgents
 */
export function buildSystemPrompt(context: {
  userId: string;
  persistentMemories: Array<{ key: string; content: string }>;
  currentRequest: string;
  stepBudget: number;
  maxSteps: number;
  customAgents: Record<string, AgentDefinition>;
}): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const memoriesSection = context.persistentMemories.length > 0
    ? `\n## What You Remember About This User\n${context.persistentMemories.map((m) => `- **${m.key}**: ${m.content}`).join("\n")}\n`
    : "";

  const customAgentList = Object.values(context.customAgents);
  const agentsSection = customAgentList.length > 0
    ? `\n## Available Expert Agents\nYou can delegate questions to these verified human experts using the delegate tool:\n${customAgentList.map((a) => `- ${a.icon} **${a.name}** (\`${a.id}\`): ${a.description}`).join("\n")}\n`
    : "";

  return `You are ADIN, an AI orchestrator for the Verified Minds platform. You coordinate expert AI agents that represent real, World ID-verified humans and their unique expertise.

TODAY: ${today}

## Your Role

You are the front door. When a user asks a question:
1. Determine if the question falls within any expert agent's domain.
2. If yes, delegate to the most appropriate expert using the \`delegate\` tool.
3. If no expert matches, answer directly using your general knowledge.
4. If unsure, briefly answer and suggest which expert agent might give a deeper answer.

## How You Delegate

When delegating, include:
- The full user question as the task
- Any relevant context from the conversation
- Let the expert agent handle the rest — don't over-instruct

## Tool Usage

- Use \`search_web\` to find current information when needed
- Use \`fetch_url\` to read specific web pages or documents
- Use \`memory_save\` to remember important facts about the user
- Use \`memory_recall\` to check what you already know
- Use \`delegate\` to hand off to specialist agents

## Budget

You have ${context.stepBudget} initial steps (max ${context.maxSteps}) for this request. Use them wisely — delegate when a specialist would give a better answer.
${memoriesSection}${agentsSection}
## Communication Style

- Be direct — answer first, then supporting details
- When presenting an expert's response, credit them: "According to [Expert Name]..."
- Don't repeat the user's question back to them
- Be concise unless depth is explicitly requested`;
}

/**
 * Build the system prompt for a delegated sub-agent.
 *
 * This wraps the agent's custom system prompt with delegation context
 * so the agent knows it's handling a specific task, not a free conversation.
 * @param agentDef
 * @param task
 * @param taskContext
 */
export function buildDelegationPrompt(
  agentDef: AgentDefinition,
  task: string,
  taskContext?: string,
): string {
  let prompt = agentDef.systemPrompt;

  prompt += `\n\n---\n\n## Current Task\n\n${task}`;

  if (taskContext) {
    prompt += `\n\n## Additional Context\n\n${taskContext}`;
  }

  prompt += `\n\n## Instructions\n
Answer this specific task directly. Be thorough but focused.
If the task is outside your expertise, say so clearly.
Do not ask follow-up questions — provide the best answer you can with what you know.`;

  return prompt;
}

/**
 * Build the delegate tool description dynamically based on available agents.
 * @param customAgents
 * @param staticAgents
 */
export function buildDelegateDescription(
  customAgents: Record<string, AgentDefinition>,
  staticAgents: Record<string, AgentDefinition>,
): string {
  const allAgents = { ...staticAgents, ...customAgents };
  const agentList = Object.values(allAgents);

  if (agentList.length === 0) {
    return "Delegate a task to a specialized agent. No agents currently available.";
  }

  const lines = agentList.map(
    (a) => `- ${a.icon} **${a.name}** (\`${a.id}\`): ${a.description}`,
  );

  return `Delegate a task to a specialized agent. Available agents:\n\n${lines.join("\n")}\n\nUse when a sub-task needs focused expertise.`;
}
