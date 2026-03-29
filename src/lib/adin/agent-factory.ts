import { createExpertAgent } from "@/lib/adin/client";
import type { DomainConfidence,KnowledgeItem } from "@/types";

/**
 * Agent Factory
 *
 * Generates a rich system prompt from extracted knowledge items
 * and creates the custom agent via the local ADIN engine.
 */

/**
 *
 * @param displayName
 * @param bio
 * @param domains
 * @param items
 * @param confidences
 */
function generateSystemPrompt(
  displayName: string,
  bio: string,
  domains: string[],
  items: KnowledgeItem[],
  confidences: DomainConfidence[],
): string {
  const domainSections = domains.map((domain) => {
    const domainItems = items.filter(
      (i) => i.domain.toLowerCase() === domain.toLowerCase(),
    );
    const confidence = confidences.find(
      (c) => c.domain.toLowerCase() === domain.toLowerCase(),
    );

    const insights = domainItems
      .map((i) => `- **${i.topic}**: ${i.content}`)
      .join("\n");

    return `## ${domain}${confidence ? ` (Confidence: ${confidence.level})` : ""}
${insights}`;
  });

  return `You are an AI agent representing ${displayName}'s expertise.

${bio}

You answer questions as ${displayName} would — with their knowledge, their perspective, and their communication style. You are not a generic AI. You represent a specific verified human's real-world expertise.

# Your Knowledge Base

${domainSections.join("\n\n")}

# How You Respond

- Answer from ${displayName}'s perspective and experience, using first person when sharing personal insights.
- Be specific. Reference the exact knowledge above rather than giving generic answers.
- If asked about something outside your knowledge domains (${domains.join(", ")}), say so honestly: "That's outside my area. I specialize in ${domains[0]}."
- Keep ${displayName}'s communication style — match their tone, whether formal or casual, technical or accessible.
- When you're drawing on a specific insight, frame it as experience: "In my experience..." or "What I've found over the years..."
- Never make up knowledge you don't have. It's better to say "I don't have a strong take on that" than to fabricate.`;
}

/**
 *
 * @param name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/**
 *
 * @param params
 * @param params.displayName
 * @param params.bio
 * @param params.domains
 * @param params.knowledgeItems
 * @param params.confidences
 */
export async function buildAndPublishAgent(params: {
  displayName: string;
  bio: string;
  domains: string[];
  knowledgeItems: KnowledgeItem[];
  confidences: DomainConfidence[];
}): Promise<string> {
  const systemPrompt = generateSystemPrompt(
    params.displayName,
    params.bio,
    params.domains,
    params.knowledgeItems,
    params.confidences,
  );

  const agentId = slugify(params.displayName);

  await createExpertAgent({
    agentId,
    name: `${params.displayName}'s Expertise`,
    description: params.bio,
    systemPrompt,
    tools: ["search_web", "fetch_url", "memory_save", "memory_recall"],
    modelTier: "balanced",
  });

  return agentId;
}
