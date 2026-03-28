/**
 * ADIN Tool Factory
 *
 * Assembles tool sets for the orchestrator and delegated agents.
 * Tools: search_web, fetch_url, memory_save, memory_recall, delegate.
 */

import { zodSchema } from "ai";
import { z } from "zod";

import { saveMemory, getPersistentMemories, getWorkingMemories } from "./memory";
import { getCustomAgentDefinitions } from "./custom-agents";
import { createDelegateTool, STATIC_AGENTS } from "./agents";
import { buildDelegateDescription } from "./prompt";
import type { AgentDefinition, ToolContext } from "./types";

import type { ToolSet } from "ai";

/**
 * Helper that builds a tool object directly, avoiding the `tool()` helper's
 * overloaded generic inference issues in AI SDK v6 + Zod 3.
 */
function defineTool<T extends z.ZodType>(config: {
  description: string;
  parameters: T;
  execute: (input: z.infer<T>, options: { toolCallId: string }) => Promise<unknown>;
}): ToolSet[string] {
  return {
    description: config.description,
    inputSchema: zodSchema(config.parameters),
    execute: config.execute,
  } as ToolSet[string];
}

// ---------------------------------------------------------------------------
// search_web — web search via DuckDuckGo HTML (no API key needed)
// ---------------------------------------------------------------------------

const searchWebSchema = z.object({
  query: z.string(),
  maxResults: z.number().optional().default(5),
});

function createSearchWebTool(): ToolSet[string] {
  return defineTool({
    description: "Search the web for current information. Returns top results with titles, URLs, and snippets.",
    parameters: searchWebSchema,
    execute: async ({ query, maxResults }) => {
      try {
        const encoded = encodeURIComponent(query);
        const res = await fetch(
          `https://html.duckduckgo.com/html/?q=${encoded}`,
          { headers: { "User-Agent": "Mozilla/5.0 (compatible; ADIN/1.0)" } },
        );
        const html = await res.text();

        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
        const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;

        let match;
        while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
          const url = decodeURIComponent(
            match[1].replace(/.*uddg=/, "").replace(/&.*/, ""),
          );
          results.push({ title: match[2].trim(), url, snippet: "" });
        }

        let i = 0;
        while ((match = snippetRegex.exec(html)) !== null && i < results.length) {
          results[i].snippet = match[1].trim();
          i++;
        }

        return { results, count: results.length };
      } catch (error) {
        return {
          results: [],
          count: 0,
          error: `Search failed: ${error instanceof Error ? error.message : "unknown"}`,
        };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// fetch_url — read a web page and return its text content
// ---------------------------------------------------------------------------

const fetchUrlSchema = z.object({
  url: z.string().url(),
  maxLength: z.number().optional().default(8000),
});

function createFetchUrlTool(): ToolSet[string] {
  return defineTool({
    description: "Fetch a URL and return its text content. Useful for reading articles, documentation, or data.",
    parameters: fetchUrlSchema,
    execute: async ({ url, maxLength }) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ADIN/1.0)" },
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          return { content: "", error: `HTTP ${res.status}: ${res.statusText}` };
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text") && !contentType.includes("json")) {
          return { content: "", error: `Non-text content type: ${contentType}` };
        }

        const text = await res.text();
        const cleaned = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          content: cleaned.slice(0, maxLength),
          url,
          truncated: cleaned.length > maxLength,
        };
      } catch (error) {
        return {
          content: "",
          error: `Fetch failed: ${error instanceof Error ? error.message : "unknown"}`,
        };
      }
    },
  });
}

// ---------------------------------------------------------------------------
// memory_save — persist a fact about the user
// ---------------------------------------------------------------------------

const memorySaveSchema = z.object({
  key: z.string(),
  content: z.string(),
  reason: z.string().optional(),
});

function createMemorySaveTool(ctx: ToolContext): ToolSet[string] {
  return defineTool({
    description: "Save an important fact or preference about the user for future reference.",
    parameters: memorySaveSchema,
    execute: async ({ key, content, reason }) => {
      const entry = saveMemory({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        scope: "persistent",
        key,
        content,
        reason: reason ?? undefined,
      });
      return { saved: true, key: entry.key };
    },
  });
}

// ---------------------------------------------------------------------------
// memory_recall — check what we know about the user
// ---------------------------------------------------------------------------

const memoryRecallSchema = z.object({
  scope: z.enum(["persistent", "working", "all"]).optional().default("all"),
});

function createMemoryRecallTool(ctx: ToolContext): ToolSet[string] {
  return defineTool({
    description: "Recall stored facts and preferences about the current user.",
    parameters: memoryRecallSchema,
    execute: async ({ scope }) => {
      const memories: Array<{ key: string; content: string; scope: string }> = [];

      if (scope === "persistent" || scope === "all") {
        const persistent = getPersistentMemories(ctx.userId);
        memories.push(...persistent.map((m) => ({ ...m, scope: "persistent" })));
      }

      if (scope === "working" || scope === "all") {
        const working = getWorkingMemories(ctx.userId, ctx.conversationId);
        memories.push(...working.map((m) => ({ ...m, scope: "working" })));
      }

      return { memories, count: memories.length };
    },
  });
}

// ---------------------------------------------------------------------------
// Tool factory — assembles the full tool set for a chat request
// ---------------------------------------------------------------------------

export function assembleTools(
  ctx: ToolContext,
  customAgentDefs: Record<string, AgentDefinition>,
): ToolSet {
  const baseTools: ToolSet = {
    search_web: createSearchWebTool(),
    fetch_url: createFetchUrlTool(),
    memory_save: createMemorySaveTool(ctx),
    memory_recall: createMemoryRecallTool(ctx),
  };

  const delegateDescription = buildDelegateDescription(customAgentDefs, STATIC_AGENTS);

  const delegateTool = createDelegateTool(
    ctx,
    baseTools,
    customAgentDefs,
    delegateDescription,
  );

  return {
    ...baseTools,
    delegate: delegateTool,
  };
}

export function assembleAgentTools(
  ctx: ToolContext,
  agentDef: AgentDefinition,
): ToolSet {
  const allTools: ToolSet = {
    search_web: createSearchWebTool(),
    fetch_url: createFetchUrlTool(),
    memory_save: createMemorySaveTool(ctx),
    memory_recall: createMemoryRecallTool(ctx),
  };

  if (agentDef.tools.length === 0) return {};

  const filtered: ToolSet = {};
  for (const toolId of agentDef.tools) {
    if (toolId in allTools) {
      filtered[toolId] = allTools[toolId];
    }
  }
  return filtered;
}
