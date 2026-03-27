"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
import VoiceOrb from "@/components/VoiceOrb";
import ProgressBar from "@/components/ProgressBar";
import { buildProfilerPrompt } from "@/lib/hume/profiler-prompt";

/**
 * Fetches existing profile state so follow-up sessions can resume
 * where the last one left off (per plan: session management).
 */
async function fetchResumeContext(profileId: string): Promise<{
  existingDomains: string[];
  existingConfidence: Record<string, number>;
  knowledgeCount: number;
  displayName: string;
} | null> {
  try {
    const res = await fetch(`/api/expertise/earnings?profileId=${profileId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      existingDomains: data.domains ?? [],
      existingConfidence: {},
      knowledgeCount: data.transactions?.length ?? 0,
      displayName: data.displayName ?? "Expert",
    };
  } catch {
    return null;
  }
}

function InterviewInner(): React.ReactElement {
  const router = useRouter();
  const {
    connect,
    disconnect,
    messages,
    sendToolMessage,
  } = useVoice();

  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusHint, setStatusHint] = useState("Tap to begin your interview");
  const profileIdRef = useRef<string>("");

  useEffect(() => {
    profileIdRef.current = sessionStorage.getItem("profileId") ?? "";
    if (!profileIdRef.current) {
      router.push("/expertise");
    }
  }, [router]);

  // Track audio levels + expression measures from Hume for the orb
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.type === "user_message") {
      setAudioLevel(0.6);
      setStatusHint("Listening...");
      setTimeout(() => setAudioLevel(0.1), 300);
    }
    if (last?.type === "assistant_message") {
      setAudioLevel(0.4);
      setStatusHint("ADIN is speaking...");
      setTimeout(() => setAudioLevel(0.1), 500);
    }
  }, [messages]);

  const handleToolCall = useCallback(
    async (toolCall: {
      name: string;
      parameters: string;
      tool_call_id: string;
    }) => {
      const params = JSON.parse(toolCall.parameters);
      const profileId = profileIdRef.current;
      let result: Record<string, unknown> = {};

      try {
        switch (toolCall.name) {
          case "save_knowledge": {
            setStatusHint("Saving an insight...");
            const res = await fetch("/api/expertise/tools/save-knowledge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...params, profileId }),
            });
            result = await res.json();
            setKnowledgeCount((c) => c + 1);
            setProgress((p) => Math.min(p + 5, 95));
            break;
          }
          case "assess_expertise": {
            setStatusHint("Assessing your expertise...");
            const res = await fetch("/api/expertise/tools/assess", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...params, profileId }),
            });
            result = await res.json();
            if (params.phase_completed) {
              setProgress((p) => Math.min(p + 15, 95));
            }
            break;
          }
          case "fetch_link": {
            setStatusHint("Reading your link...");
            const res = await fetch("/api/expertise/tools/fetch-link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(params),
            });
            result = await res.json();
            setProgress((p) => Math.min(p + 10, 95));
            break;
          }
          case "create_agent": {
            setStatusHint("Building your agent...");
            const res = await fetch("/api/expertise/tools/create-agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...params, profileId }),
            });
            result = await res.json();
            setIsComplete(true);
            setProgress(100);
            setTimeout(() => router.push("/expertise/done"), 3000);
            break;
          }
          default:
            result = { error: `Unknown tool: ${toolCall.name}` };
        }
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : "Tool call failed",
        };
      }

      sendToolMessage({
        toolCallId: toolCall.tool_call_id,
        content: JSON.stringify(result),
      } as Parameters<typeof sendToolMessage>[0]);
    },
    [router, sendToolMessage],
  );

  // Listen for tool call events in Hume messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      last &&
      "type" in last &&
      (last as Record<string, unknown>).type === "tool_call"
    ) {
      const tc = last as unknown as {
        name: string;
        parameters: string;
        tool_call_id: string;
      };
      handleToolCall(tc);
    }
  }, [messages, handleToolCall]);

  async function handleStart(): Promise<void> {
    try {
      setStatusHint("Connecting...");

      // Fetch Hume access token
      const tokenRes = await fetch("/api/auth/hume-token");
      const { accessToken } = await tokenRes.json();

      // Load resume context for follow-up sessions (per plan: session management)
      const ctx = await fetchResumeContext(profileIdRef.current);

      // Build profiler system prompt with any existing extraction state
      const systemPrompt = buildProfilerPrompt(
        ctx ?? undefined,
      );

      await connect({
        auth: { type: "accessToken", value: accessToken },
        configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID,
        sessionSettings: { systemPrompt },
      } as Parameters<typeof connect>[0]);

      if (ctx?.knowledgeCount) {
        setKnowledgeCount(ctx.knowledgeCount);
        setProgress(Math.min(ctx.knowledgeCount * 5, 60));
      }

      setIsConnected(true);
      setStatusHint("ADIN is listening — just talk naturally");
    } catch {
      setStatusHint("Connection failed — tap to retry");
    }
  }

  function handleEnd(): void {
    disconnect();
    setIsConnected(false);
    router.push("/expertise/done");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {isConnected && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
          <ProgressBar progress={progress} itemCount={knowledgeCount} />
        </div>
      )}

      <VoiceOrb
        audioLevel={audioLevel}
        isActive={isConnected}
        isComplete={isComplete}
      />

      <p className="text-sm text-[var(--muted)] text-center max-w-[240px]">
        {statusHint}
      </p>

      {!isConnected ? (
        <button
          onClick={handleStart}
          className="py-3.5 px-8 rounded-2xl bg-[var(--accent)] text-white font-medium text-base
                     shadow-[var(--shadow-md)] hover:opacity-90 active:scale-[0.98]"
        >
          Start Interview
        </button>
      ) : (
        <button
          onClick={handleEnd}
          className="py-2.5 px-5 rounded-xl text-[var(--muted)] text-sm
                     hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
        >
          End early
        </button>
      )}

      {isComplete && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--success-bg)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <p className="text-[var(--success)] text-sm font-medium">
            Your agent is live!
          </p>
        </div>
      )}
    </div>
  );
}

export default function InterviewPage(): React.ReactElement {
  return (
    <VoiceProvider>
      <InterviewInner />
    </VoiceProvider>
  );
}
