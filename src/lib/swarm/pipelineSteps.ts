/**
 * LLM-call helpers for the swarm orchestrator pipeline.
 *
 * Extracted from orchestrator.ts to keep individual files under the
 * max-lines lint rule while remaining cohesive.
 */

import OpenAI from "openai";

import {
  runAgentWorkWithTools,
  runDirectCompletion,
  runSwarmChatWithTools,
} from "./tools";

// ---- Shared types ----

export interface AgentPersona {
  id: string;
  name: string;
  expertise: string;
  style: string;
}

export interface SwarmManifest {
  agents: AgentPersona[];
  strategy: string;
}

export interface SubIntent {
  content: string;
  delegatable?: boolean;
}

export interface CompletedWork {
  agentId: string;
  agentName: string;
  subIntent: string;
  result: string;
}

export interface CritiqueResult {
  reviewerId: string;
  reviewerName: string;
  targetAgentName: string;
  targetSubIntent: string;
  content: string;
}

export interface PipelineResult {
  deliverable: string;
  completedWork: CompletedWork[];
}

export type RunStatus =
  | "started"
  | "exploring"
  | "critiquing"
  | "synthesizing"
  | "completed"
  | "failed"
  | "aborted";

export interface RunRecord {
  runId: string;
  intentId: string;
  status: RunStatus;
  depth: number;
  startedAt: number;
  finishedAt?: number;
  elapsedMs?: number;
  agentCount?: number;
  subGoalCount?: number;
  completedCount?: number;
  critiqueCount?: number;
  error?: string;
}

const MAX_DEPTH = 5;

// ---- LLM Calls ----

/** Decompose a goal into sub-intents and design an agent team. */
export async function decomposeAndPlan(
  openai: OpenAI,
  model: string,
  content: string,
  depth: number,
): Promise<{ subIntents: SubIntent[]; manifest: SwarmManifest }> {
  const isSubSwarm = depth > 0;
  const delegationGuidance = isSubSwarm
    ? `You are decomposing a SCOPED sub-goal (depth ${depth}). Keep it focused:
- 2-5 sub-goals maximum
- 2-4 agents maximum
- Mark a sub-goal as delegatable ONLY if it has 3+ truly independent specialist dimensions; be conservative.`
    : `You may mark a sub-goal as delegatable: true if it is broad enough that 2+ independent specialists would each add distinct value. Simple, focused tasks must NOT be delegated. Delegate sparingly.`;

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a swarm architect. Given any goal, you do two things:

1. Break it into specific, actionable sub-goals. Scale to complexity: a simple goal may need 2-3 sub-goals; ambitious goals could need 8-12.

2. Design a team of AI agents. Create exactly as many as the goal demands -- match their expertise to the domain.

${delegationGuidance}

Each agent needs: unique short id (lowercase, no spaces), creative name, specific expertise, working style.

Return JSON:
{
  "subIntents": [{ "content": "description", "delegatable": false }],
  "manifest": {
    "strategy": "how agents collaborate",
    "agents": [{ "id": "jules", "name": "Jules", "expertise": "...", "style": "..." }]
  }
}`,
      },
      { role: "user", content: `Goal: "${content}"` },
    ],
    temperature: 0.9,
    max_completion_tokens: isSubSwarm ? 1800 : 3200,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("No LLM response");
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed.subIntents)) {
    parsed.subIntents = parsed.subIntents.map((s: SubIntent) => ({
      ...s,
      delegatable: depth < MAX_DEPTH ? Boolean(s.delegatable) : false,
    }));
  }
  return parsed;
}

/** Ask an agent whether it should take a sub-goal. */
export async function agentDecide(
  openai: OpenAI,
  model: string,
  agent: AgentPersona,
  intentContent: string,
  allSubIntents: string[],
  completedWork: CompletedWork[],
): Promise<{ accept: boolean; reason: string; approach: string } | null> {
  const priorWorkContext =
    completedWork.length > 0
      ? `\n\nWork already completed by other agents:\n${completedWork.map((w) => `- ${w.agentName} handled "${w.subIntent}" -> ${w.result}`).join("\n")}`
      : "";

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are ${agent.name}, with expertise in ${agent.expertise}. Your style: ${agent.style}.

You're part of a swarm working toward a shared goal. A sub-goal has been posted. Decide if you're the right one to handle it.

Consider:
- What unique angle does your expertise bring?
- Can you produce a concrete, useful outcome?
- Would someone else on the team be better suited?

If you accept, describe your specific approach.

Return JSON:
{
  "accept": true/false,
  "reason": "why you're the right (or wrong) fit",
  "approach": "if accepting: your specific plan of attack in 1-2 sentences"
}`,
      },
      {
        role: "user",
        content: `Sub-goal: "${intentContent}"\n\nAll sub-goals:\n${allSubIntents.map((s, i) => `${i + 1}. ${s}`).join("\n")}${priorWorkContext}`,
      },
    ],
    temperature: 0.8,
    max_completion_tokens: 300,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  return JSON.parse(raw);
}

/** Run an agent's primary work on its claimed sub-goal. */
export async function agentWork(
  openai: OpenAI,
  agent: AgentPersona,
  intentContent: string,
  approach: string,
  completedWork: CompletedWork[],
): Promise<string> {
  const priorContext =
    completedWork.length > 0
      ? `\n\nPrior results from teammates:\n${completedWork.map((w) => `- ${w.agentName}: ${w.result}`).join("\n")}`
      : "";

  return runAgentWorkWithTools(openai, {
    agentName: agent.name,
    expertise: agent.expertise,
    style: agent.style,
    intentContent,
    approach,
    priorContext,
  });
}

/** Have an agent critique a teammate's work. */
export async function agentCritique(
  openai: OpenAI,
  agent: AgentPersona,
  ownWork: CompletedWork,
  reviewTarget: CompletedWork,
  originalIntent: string,
): Promise<string> {
  const system = `You are ${agent.name}, with expertise in ${agent.expertise}. Your style: ${agent.style}.

You just finished your own contribution. Now review a teammate's work critically but constructively.

Answer in 2-4 sentences: What is strong? What is missing, unclear, or risky? What would you add, challenge, or refine?`;

  const user = `Overall goal: "${originalIntent}"

Your work was on: "${ownWork.subIntent}"
Your output summary: ${ownWork.result}

Teammate ${reviewTarget.agentName}'s work was on: "${reviewTarget.subIntent}"
Their output: ${reviewTarget.result}`;

  return runSwarmChatWithTools(openai, {
    system,
    user,
    temperature: 0.65,
    max_completion_tokens: 600,
  });
}

/** Combine all agent work and critiques into a final deliverable. */
export async function synthesizeDeliverable(
  openai: OpenAI,
  originalIntent: string,
  completedWork: CompletedWork[],
  critiques: CritiqueResult[],
  manifest: SwarmManifest,
  depth: number,
): Promise<string> {
  const MAX_RESULT_CHARS = depth === 0 ? 1800 : 1200;
  const MAX_CRITIQUE_CHARS = depth === 0 ? 700 : 500;

  const workBlock = completedWork
    .map((w) => {
      const result =
        w.result.length > MAX_RESULT_CHARS
          ? `${w.result.slice(0, MAX_RESULT_CHARS)}...`
          : w.result;
      return `### ${w.agentName} (${w.subIntent})\n${result}`;
    })
    .join("\n\n");

  const critiqueBlock =
    critiques.length > 0
      ? critiques
          .map((c) => {
            const content =
              c.content.length > MAX_CRITIQUE_CHARS
                ? `${c.content.slice(0, MAX_CRITIQUE_CHARS)}...`
                : c.content;
            return `### ${c.reviewerName} on ${c.targetAgentName}'s "${c.targetSubIntent}"\n${content}`;
          })
          .join("\n\n")
      : "(No peer critiques.)";

  const depthNote =
    depth > 0
      ? "\nThis is a sub-deliverable that will be integrated into a larger synthesis. Be thorough but focused."
      : "";

  const system = `You are synthesizing the collective output of a swarm of AI agents into a final deliverable.

Combine all agent work and peer critiques into one comprehensive, actionable document.${depthNote}

Requirements:
- Use full markdown: ## / ### headings, **bold**, *italic*, bullet/numbered lists, tables where they aid comparison.
- Integrate findings into a unified narrative -- do not merely list who did what.
- Where critiques raised gaps or disagreements, resolve or surface the tradeoff.
- Be thorough and useful. Multiple sections, multiple paragraphs.
- Write the entire deliverable in this single response.`;

  const user = `Original goal:\n"${originalIntent}"\n\nSwarm strategy:\n${manifest.strategy}\n\n--- Agent work ---\n${workBlock}\n\n--- Peer critiques ---\n${critiqueBlock}`;

  const synthesized = await runDirectCompletion(openai, {
    system,
    user,
    temperature: 0.45,
    max_completion_tokens: depth === 0 ? 4000 : 2000,
  });

  return (
    synthesized.trim() ||
    `Sub-swarm complete: ${completedWork.length} sub-goals explored by ${manifest.agents.length} agents.`
  );
}
