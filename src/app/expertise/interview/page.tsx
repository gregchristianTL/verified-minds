"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { Howl } from "howler";
import VoiceOrb from "@/components/VoiceOrb";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildProfilerPrompt } from "@/lib/hume/profiler-prompt";
import { scaleIn, fadeInUp, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { useSoundStore } from "@/providers/SoundProvider";
import { CheckCircle2 } from "lucide-react";

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
  const { play } = useSoundSystem();
  const isMuted = useSoundStore((s) => s.isMuted);
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
  const ambientRef = useRef<Howl | null>(null);

  useEffect(() => {
    profileIdRef.current = sessionStorage.getItem("profileId") ?? "";
    if (!profileIdRef.current) {
      router.push("/expertise");
    }
  }, [router]);

  // Ambient sound management - fade in on connect, fade out on disconnect
  useEffect(() => {
    if (isConnected && !isMuted && !ambientRef.current) {
      const ambient = new Howl({
        src: ["/sounds/navigate.mp3"],
        loop: true,
        volume: 0,
      });
      ambient.play();
      ambient.fade(0, 0.06, 2000);
      ambientRef.current = ambient;
    }

    return () => {
      if (ambientRef.current) {
        ambientRef.current.fade(ambientRef.current.volume(), 0, 1000);
        const ref = ambientRef.current;
        setTimeout(() => ref.unload(), 1200);
        ambientRef.current = null;
      }
    };
  }, [isConnected, isMuted]);

  // Modulate ambient volume based on audio level
  useEffect(() => {
    if (ambientRef.current && isConnected) {
      const targetVol = 0.04 + audioLevel * 0.08;
      ambientRef.current.volume(targetVol);
    }
  }, [audioLevel, isConnected]);

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
            play("receive");
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
            play("success");
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
    [router, sendToolMessage, play],
  );

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
      play("click");
      setStatusHint("Connecting...");

      const tokenRes = await fetch("/api/auth/hume-token");
      const { accessToken } = await tokenRes.json();
      const ctx = await fetchResumeContext(profileIdRef.current);
      const systemPrompt = buildProfilerPrompt(ctx ?? undefined);

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
      play("error");
    }
  }

  function handleEnd(): void {
    play("click");
    disconnect();
    setIsConnected(false);
    router.push("/expertise/done");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {/* Progress bar - fixed at top when connected */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ProgressBar progress={progress} itemCount={knowledgeCount} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice orb with entrance animation */}
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        transition={{ ...gentle, delay: 0.1 }}
      >
        <VoiceOrb
          audioLevel={audioLevel}
          isActive={isConnected}
          isComplete={isComplete}
        />
      </motion.div>

      <motion.p
        className="text-sm text-muted-foreground text-center max-w-[240px]"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...gentle, delay: 0.2 }}
      >
        {statusHint}
      </motion.p>

      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...gentle, delay: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {!isConnected ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={gentle}
            >
              <Button
                onClick={handleStart}
                size="lg"
                className="py-6 px-8 rounded-2xl text-base shadow-lg hover:shadow-xl
                           transition-shadow active:scale-[0.97]"
              >
                Start Interview
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={gentle}
            >
              <Button
                onClick={handleEnd}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                End early
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Completion banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={gentle}
          >
            <Alert className="border-vm-success/30 bg-vm-success-bg">
              <CheckCircle2 className="size-4 text-vm-success" />
              <AlertDescription className="text-vm-success font-medium">
                Your agent is live!
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
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
