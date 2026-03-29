import type { PhaseId } from "@/components/ProgressBar";

/**
 * Side effects returned by a tool call dispatch for the caller to apply
 */
export interface ToolCallSideEffects {
  /** API response JSON (sent back to the model) */
  result: Record<string, unknown>;
  /** Increment knowledge count by this amount */
  knowledgeDelta?: number;
  /** Increment progress by this amount (capped at 95) */
  progressDelta?: number;
  /** Sound to play */
  sound?: "receive" | "success" | "error";
  /** Updated status hint text */
  statusHint?: string;
  /** Phase that was just completed */
  completedPhase?: PhaseId;
  /** Knowledge save notification for the progress bar */
  savedItem?: { topic: string; domain: string };
  /** Signals the create_agent flow succeeded */
  agentCreated?: boolean;
  /** Error message from create_agent */
  createError?: string;
}

/**
 * Dispatches a tool call to the appropriate API endpoint and returns
 * the result + side effects to apply in the UI.
 *
 * Keeps fetch logic separate from React state management.
 * @param name
 * @param args
 * @param profileId
 * @param sessionId
 */
export async function dispatchToolCall(
  name: string,
  args: string,
  profileId: string,
  sessionId: string,
): Promise<ToolCallSideEffects> {
  let params: Record<string, unknown>;
  try {
    params = JSON.parse(args) as Record<string, unknown>;
  } catch {
    return { result: { error: `Malformed tool arguments: ${args.slice(0, 200)}` } };
  }

  switch (name) {
    case "save_knowledge": {
      const res = await fetch("/api/expertise/tools/save-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, profileId, sessionId }),
      });
      const result = await res.json();
      const effects: ToolCallSideEffects = {
        result,
        knowledgeDelta: 1,
        progressDelta: 5,
        sound: "receive",
        statusHint: "Saved — keep going",
      };
      if (res.ok) {
        effects.savedItem = {
          topic: (params.topic as string) ?? "insight",
          domain: (params.domain as string) ?? "",
        };
      }
      return effects;
    }

    case "assess_expertise": {
      const res = await fetch("/api/expertise/tools/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, profileId }),
      });
      const result = await res.json();
      const effects: ToolCallSideEffects = { result };
      if (params.phase_completed) {
        effects.completedPhase = params.phase_completed as PhaseId;
        effects.progressDelta = 15;
      }
      return effects;
    }

    case "fetch_link": {
      const res = await fetch("/api/expertise/tools/fetch-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return {
        result: await res.json(),
        progressDelta: 10,
        statusHint: "Got it — continuing...",
      };
    }

    case "create_agent": {
      const res = await fetch("/api/expertise/tools/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, profileId }),
      });
      const result = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const msg =
          typeof result.error === "string"
            ? result.error
            : "Failed to create agent";
        return {
          result: { error: msg },
          createError: msg,
        };
      }
      return {
        result,
        agentCreated: true,
        sound: "success",
        statusHint: "Building your agent...",
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}
