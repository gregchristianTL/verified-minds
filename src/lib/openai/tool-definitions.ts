/**
 * OpenAI Realtime API Tool Definitions
 *
 * These define the function tools available to the Realtime model
 * during voice interviews. Passed via session.tools in the SDP handshake.
 */

export interface RealtimeToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const PROFILER_TOOLS: RealtimeToolDefinition[] = [
  {
    type: "function",
    name: "save_knowledge",
    description:
      "Save an extracted knowledge nugget from the expert. Call this immediately when the expert shares a valuable insight — don't batch.",
    parameters: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description:
            "The expertise domain (e.g., 'neapolitan pizza', 'BMW engines')",
        },
        topic: {
          type: "string",
          description:
            "Specific topic label (e.g., 'dough hydration', 'turbo diagnostics')",
        },
        content: {
          type: "string",
          description: "The full knowledge insight in the expert's voice",
        },
        phase: {
          type: "string",
          enum: [
            "domain_id",
            "boundaries",
            "unique_signal",
            "decision_frameworks",
            "persona",
            "verification",
          ],
          description: "Which extraction phase this knowledge came from",
        },
      },
      required: ["domain", "topic", "content", "phase"],
    },
  },
  {
    type: "function",
    name: "assess_expertise",
    description:
      "Update confidence assessment for a domain. Call when you complete a phase or learn enough to rate a domain.",
    parameters: {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "The domain being assessed",
        },
        confidence: {
          type: "number",
          description: "Confidence score 0-100",
        },
        evidence: {
          type: "string",
          description: "What supports this confidence level",
        },
        gaps: {
          type: "array",
          items: { type: "string" },
          description: "Specific knowledge gaps remaining",
        },
        phase_completed: {
          type: "string",
          enum: [
            "domain_id",
            "boundaries",
            "unique_signal",
            "decision_frameworks",
            "persona",
            "verification",
          ],
          description: "Which phase was just completed (if any)",
        },
      },
      required: ["domain", "confidence", "evidence"],
    },
  },
  {
    type: "function",
    name: "fetch_link",
    description:
      "Ingest content from a URL the expert mentions. Use to cross-reference their claims or extract knowledge from their documents.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch and ingest",
        },
        context: {
          type: "string",
          description: "Why this URL is relevant to the extraction",
        },
      },
      required: ["url", "context"],
    },
  },
  {
    type: "function",
    name: "create_agent",
    description:
      "Create the expert's AI sub-agent. Call ONLY when phases 1-3 are complete (domain ID, boundaries, unique signal).",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Display name for the agent (e.g., 'Maria's Pizza Expertise')",
        },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "List of expertise domains",
        },
        bio: {
          type: "string",
          description:
            "One-paragraph bio summarizing who this expert is and what they know",
        },
      },
      required: ["name", "domains", "bio"],
    },
  },
];
