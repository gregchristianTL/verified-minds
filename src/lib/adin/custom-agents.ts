import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { customAgents } from "@/lib/db/schema";

import type { AgentDefinition, ModelTier } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCustomAgentInput {
  userId?: string | null;
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  icon?: string;
  modelTier?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

type CustomAgentRow = typeof customAgents.$inferSelect;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TIERS = new Set(["micro", "fast", "balanced", "power", "reasoning"]);

function sanitizeAgentId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function toAgentDefinition(row: CustomAgentRow): AgentDefinition {
  const tools: string[] = JSON.parse(row.tools || "[]");
  return {
    id: row.agentId,
    name: row.name,
    description: row.description,
    icon: row.icon,
    systemPrompt: row.systemPrompt,
    tools,
    modelTier: (VALID_TIERS.has(row.modelTier) ? row.modelTier : "balanced") as ModelTier,
    upgradeTier: row.upgradeTier as ModelTier | null,
    isCustom: true,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createCustomAgent(
  input: CreateCustomAgentInput,
): Promise<{ agent: AgentDefinition } | { error: string }> {
  const agentId = sanitizeAgentId(input.agentId);

  if (!agentId || !input.name || !input.systemPrompt) {
    return { error: "agentId, name, and systemPrompt are required" };
  }

  const tier = input.modelTier && VALID_TIERS.has(input.modelTier) ? input.modelTier : "balanced";

  const existing = db
    .select({ id: customAgents.id })
    .from(customAgents)
    .where(
      and(
        eq(customAgents.agentId, agentId),
        input.userId ? eq(customAgents.userId, input.userId) : isNull(customAgents.userId),
      ),
    )
    .limit(1)
    .all();

  if (existing.length > 0) {
    return { error: `An agent with ID "${agentId}" already exists` };
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.insert(customAgents)
    .values({
      id,
      userId: input.userId ?? null,
      agentId,
      name: input.name.trim(),
      description: input.description.trim(),
      icon: input.icon || "🤖",
      systemPrompt: input.systemPrompt.trim(),
      tools: JSON.stringify(input.tools || []),
      modelTier: tier,
      createdBy: input.createdBy || "orchestrator",
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    agent: {
      id: agentId,
      name: input.name.trim(),
      description: input.description.trim(),
      icon: input.icon || "🤖",
      systemPrompt: input.systemPrompt.trim(),
      tools: input.tools || [],
      modelTier: tier as ModelTier,
      isCustom: true,
    },
  };
}

export function getCustomAgents(userId?: string): AgentDefinition[] {
  const rows = userId
    ? db
        .select()
        .from(customAgents)
        .where(
          and(
            eq(customAgents.isActive, true),
            // Return global agents + user-specific agents
            // SQLite OR: just do two queries and merge
          ),
        )
        .all()
        .filter((r) => r.userId === userId || r.userId === null)
    : db
        .select()
        .from(customAgents)
        .where(and(eq(customAgents.isActive, true), isNull(customAgents.userId)))
        .all();

  return rows.map(toAgentDefinition);
}

/** Returns a map of agentId -> AgentDefinition for merging with static agents */
export function getCustomAgentDefinitions(
  userId?: string,
): Record<string, AgentDefinition> {
  const agents = getCustomAgents(userId);
  const result: Record<string, AgentDefinition> = {};
  for (const agent of agents) {
    result[agent.id] = agent;
  }
  return result;
}

export function deactivateCustomAgent(agentId: string, userId?: string): boolean {
  const result = db
    .update(customAgents)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(customAgents.agentId, agentId),
        userId ? eq(customAgents.userId, userId) : isNull(customAgents.userId),
      ),
    )
    .run();

  return result.changes > 0;
}
