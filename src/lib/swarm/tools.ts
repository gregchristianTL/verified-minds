/**
 * OpenAI tool loop for swarm agents.
 *
 * Provides three tool-enabled chat helpers:
 * - `runSwarmChatWithTools` -- general-purpose with Exa + datetime tools
 * - `runAgentWorkWithTools` -- explore-phase agent work
 * - `runDirectCompletion`  -- single-shot completion (no tools)
 *
 * Tools available: current_datetime, web_search (Exa), fetch_url (Exa).
 * Web tools are only active when EXA_API_KEY is set.
 */

import type OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

import { exaGetContents, exaSearch, isExaConfigured } from "./exaClient";

/** Configurable model; defaults to gpt-4o-mini */
const SWARM_CHAT_MODEL =
  process.env.OPENAI_SWARM_MODEL?.trim() || "gpt-4o-mini";

const DEFAULT_MAX_TOOL_ROUNDS = 12;

/** Build the tool array: always datetime, optionally Exa search + fetch. */
function buildSwarmWorkTools(): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "current_datetime",
        description:
          'Current UTC time as ISO 8601 and unix ms. Use when framing needs "today", seasons, or deadlines.',
        parameters: { type: "object", properties: {} },
      },
    },
  ];

  if (isExaConfigured()) {
    tools.unshift(
      {
        type: "function",
        function: {
          name: "web_search",
          description:
            "Search the public web (Exa) for facts, news, benchmarks, or sources. Prefer 1-3 focused queries.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              maxResults: {
                type: "integer",
                description: "Results to return (1-10, default 6)",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "fetch_url",
          description:
            "Load readable text from one public HTTPS page. Do not use for localhost or internal hosts.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "HTTPS URL" },
              maxCharacters: {
                type: "integer",
                description:
                  "Max characters of page text (default 12000, max 50000)",
              },
            },
            required: ["url"],
          },
        },
      },
    );
  }

  return tools;
}

/** Appended to every tool-enabled system prompt. */
function toolCapabilityFooter(): string {
  if (isExaConfigured()) {
    return `You have tools: current_datetime, web_search (Exa), and fetch_url (read a public HTTPS page).

CRITICAL -- use web_search proactively:
- For ANY question involving current events, live data, prices, news, or recent developments: search FIRST, then answer.
- Run 1-3 focused queries. Follow up with fetch_url on promising results when more detail is needed.
- Synthesize search findings into a direct, concrete answer.
- If search returns nothing useful, say so briefly and give the best answer you can.

After all tool calls, produce the final response requested above.`;
  }
  return `You have the current_datetime tool. Web search and URL fetch are not configured (no EXA_API_KEY). Use current_datetime when you need the real "now"; otherwise rely on the materials in this conversation. After any tool call, produce the final response requested above.`;
}

/** Execute one tool call and return a JSON string result. */
async function runSwarmTool(
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: "Invalid JSON arguments" });
  }

  try {
    if (name === "current_datetime") {
      return JSON.stringify({
        isoUtc: new Date().toISOString(),
        unixMs: Date.now(),
      });
    }

    if (name === "web_search") {
      if (!isExaConfigured()) {
        return JSON.stringify({ error: "EXA_API_KEY not set" });
      }
      const query = String(args.query ?? "").trim();
      if (!query) {
        return JSON.stringify({ error: "query is required" });
      }
      const maxResults = Math.min(
        10,
        Math.max(1, Number(args.maxResults) || 6),
      );
      const { results } = await exaSearch(query, { maxResults });
      const slim = results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content.slice(0, 450),
        publishedDate: r.publishedDate,
      }));
      return JSON.stringify({ results: slim });
    }

    if (name === "fetch_url") {
      if (!isExaConfigured()) {
        return JSON.stringify({ error: "EXA_API_KEY not set" });
      }
      const url = String(args.url ?? "");
      try {
        const u = new URL(url);
        if (u.protocol !== "https:") {
          return JSON.stringify({ error: "Only HTTPS URLs are allowed." });
        }
        const host = u.hostname.toLowerCase();
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host.startsWith("192.168.") ||
          host.startsWith("10.") ||
          host.startsWith("172.16.")
        ) {
          return JSON.stringify({ error: "Private URLs are not allowed." });
        }
      } catch {
        return JSON.stringify({ error: "Invalid URL" });
      }
      const maxCharacters = Math.min(
        50_000,
        Math.max(2000, Number(args.maxCharacters) || 12_000),
      );
      const { results } = await exaGetContents([url], { maxCharacters });
      const r = results[0];
      if (!r?.text) {
        return JSON.stringify({ error: "No text retrieved from URL." });
      }
      return JSON.stringify({
        url: r.url,
        title: r.title,
        text: r.text.slice(0, maxCharacters),
        truncated: r.text.length >= maxCharacters,
      });
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ error: msg });
  }
}

export interface RunSwarmChatWithToolsParams {
  system: string;
  user: string;
  temperature: number;
  max_completion_tokens: number;
  maxToolRounds?: number;
}

export interface RunDirectCompletionParams {
  system: string;
  user: string;
  temperature: number;
  max_completion_tokens: number;
}

/**
 * Single-shot completion with no tools.
 * Used for synthesis and structured JSON extraction.
 */
export async function runDirectCompletion(
  openai: OpenAI,
  params: RunDirectCompletionParams,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: SWARM_CHAT_MODEL,
    messages: [
      { role: "system", content: params.system.trim() },
      { role: "user", content: params.user },
    ],
    temperature: params.temperature,
    max_completion_tokens: params.max_completion_tokens,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Run a chat completion with the shared swarm tool set (datetime + optional Exa).
 *
 * @param openai - OpenAI client instance
 * @param params - system/user messages, temperature, and token limit
 * @returns final assistant text after any tool rounds
 */
export async function runSwarmChatWithTools(
  openai: OpenAI,
  params: RunSwarmChatWithToolsParams,
): Promise<string> {
  const tools = buildSwarmWorkTools();
  const maxRounds = params.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${params.system.trim()}\n\n${toolCapabilityFooter()}`,
    },
    { role: "user", content: params.user },
  ];

  let rounds = 0;
  while (rounds < maxRounds) {
    rounds += 1;
    const completion = await openai.chat.completions.create({
      model: SWARM_CHAT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: params.temperature,
      max_completion_tokens: params.max_completion_tokens,
    });

    const choice = completion.choices[0];
    const msg = choice?.message;
    if (!msg) return "";

    if (msg.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      });

      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        const out = await runSwarmTool(
          tc.function.name,
          tc.function.arguments ?? "{}",
        );
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: out,
        });
      }
      continue;
    }

    const text = msg.content?.trim();
    if (text) return text;
  }

  try {
    const final = await openai.chat.completions.create({
      model: SWARM_CHAT_MODEL,
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "You have reached the tool use limit. Synthesize everything you have so far into a complete written response now. Do not attempt any more tool calls.",
        },
      ],
      tool_choice: "none",
      temperature: params.temperature,
      max_completion_tokens: params.max_completion_tokens,
    });
    const text = final.choices[0]?.message?.content?.trim();
    if (text) return text;
  } catch {
    /* fall through to static fallback */
  }

  return "Completed (tool round limit reached).";
}

export interface AgentWorkToolParams {
  agentName: string;
  expertise: string;
  style: string;
  intentContent: string;
  approach: string;
  priorContext: string;
}

/**
 * Run explore-phase work with optional Exa tools.
 *
 * @param openai - OpenAI client instance
 * @param params - agent identity and task details
 * @returns final assistant text
 */
export async function runAgentWorkWithTools(
  openai: OpenAI,
  params: AgentWorkToolParams,
): Promise<string> {
  const system = `You are ${params.agentName} (${params.expertise}). Style: ${params.style}.

You committed to this sub-goal with a specific approach. Deliver a concrete outcome for the team.

If this sub-goal requires current facts, live data, news, or real-world information: use web_search immediately. Search, read the results, and give a real answer.

After any tool use, synthesize into a clear written result: insights, recommendations, or findings. Use markdown (headings, bullets) if it improves clarity.

Roughly 3-8 sentences of substance unless the sub-goal is trivial.`;

  const user = `Sub-goal: "${params.intentContent}"
Your approach: "${params.approach}"${params.priorContext}`;

  return runSwarmChatWithTools(openai, {
    system,
    user,
    temperature: 0.65,
    max_completion_tokens: 900,
  });
}
