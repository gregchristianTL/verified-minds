"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceProvider, useVoice } from "@humeai/voice-react";
import { Howl } from "howler";
import AsciiLandscape from "@/components/AsciiLandscape";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buildProfilerPrompt } from "@/lib/hume/profiler-prompt";
import { fadeInUp, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { useSoundStore } from "@/providers/SoundProvider";
import { CheckCircle2, AlertTriangle, Mic } from "lucide-react";
import BalanceSheet from "@/components/BalanceSheet";

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
  const [userIdentity, setUserIdentity] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.00");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [deviceMuted, setDeviceMuted] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const profileIdRef = useRef<string>("");
  const ambientRef = useRef<Howl | null>(null);

  useEffect(() => {
    profileIdRef.current = sessionStorage.getItem("profileId") ?? "";
    setUserIdentity(
      sessionStorage.getItem("walletAddress") ||
      sessionStorage.getItem("userId") ||
      "",
    );
    if (!profileIdRef.current) {
      router.push("/expertise");
      return;
    }

    // Fetch current balance
    fetch(`/api/expertise/earnings?profileId=${profileIdRef.current}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.totalEarnings) {
          setBalance(parseFloat(data.totalEarnings).toFixed(2));
        }
      })
      .catch(() => {});
  }, [router]);

  // Check microphone permission
  useEffect(() => {
    if (!navigator.permissions) {
      setMicPermission("unknown");
      return;
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicPermission(status.state as "granted" | "denied" | "prompt");
        status.onchange = () => {
          setMicPermission(status.state as "granted" | "denied" | "prompt");
        };
      })
      .catch(() => setMicPermission("unknown"));
  }, []);

  // Detect device muted (volume = 0) via a silent AudioContext probe
  useEffect(() => {
    async function checkMuted(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        let silentFrames = 0;
        let totalFrames = 0;
        const requiredFrames = 15;

        const check = (): void => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          totalFrames++;

          if (avg < 1) {
            silentFrames++;
          } else {
            silentFrames = 0;
            setDeviceMuted(false);
          }

          // Only flag muted after sustained silence across all sampled frames
          if (totalFrames >= requiredFrames) {
            setDeviceMuted(silentFrames >= requiredFrames);
            cleanup();
          }
        };
        const interval = setInterval(check, 100);
        const timeout = setTimeout(() => cleanup(), 2000);

        function cleanup(): void {
          clearInterval(interval);
          clearTimeout(timeout);
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
        }
      } catch {
        // getUserMedia failed — mic permission alert handles this
      }
    }

    if (micPermission === "granted") {
      checkMuted();
    }
  }, [micPermission]);

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

  const showMicAlert = micPermission === "denied" || micPermission === "prompt";

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black">
      {/* Fullscreen ASCII landscape background */}
      <AsciiLandscape
        audioLevel={audioLevel}
        isActive={isConnected}
        isComplete={isComplete}
        identity={userIdentity || undefined}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2">
          <span className="text-sm font-heading text-white font-normal tracking-tight">Verified Minds</span>
          <span className="text-sm font-heading text-white/30 font-semibold tracking-tight">v0.1.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBalanceOpen(true)}
            className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                       hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer"
          >
            <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Balance</span>
            <span className="text-sm font-heading text-white font-semibold">{balance} <span className="text-white/50">USDC</span></span>
          </button>
          <AnimatePresence>
            {deviceMuted && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-1.5 backdrop-blur-md bg-amber-500/20 border border-amber-500/30
                           rounded-full px-3 py-1.5 text-xs text-amber-300"
              >
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>Device muted</span>
              </motion.div>
            )}
            {showMicAlert && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-1.5 backdrop-blur-md bg-red-500/20 border border-red-500/30
                           rounded-full px-3 py-1.5 text-xs text-red-300"
              >
                <Mic className="size-3.5 shrink-0" />
                <span>{micPermission === "denied" ? "Mic blocked" : "Mic required"}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Progress bar - fixed below header when connected */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            className="fixed top-14 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ProgressBar progress={progress} itemCount={knowledgeCount} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <div className="relative z-10 flex flex-col items-center gap-5 max-w-2xl px-6">

        <motion.p
          className="text-sm text-white/60 text-center max-w-[260px]"
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
                  className="text-white/50 hover:text-white"
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

      <BalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        profileId={profileIdRef.current}
      />

      {/* Footer — 3-column explainer */}
      {!isConnected && (
        <motion.footer
          className="fixed bottom-0 left-0 right-0 z-10 px-8 pb-12 pt-16
                     bg-gradient-to-t from-black/80 to-transparent"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ ...gentle, delay: 0.25 }}
        >
          <div className="flex w-full justify-between">
            {[
              {
                step: "01",
                title: "Talk",
                desc: "ADIN interviews you about your expertise. ~15 min, just a conversation.",
              },
              {
                step: "02",
                title: "Build",
                desc: "Your knowledge gets extracted into a verified AI agent that thinks like you.",
              },
              {
                step: "03",
                title: "Earn",
                desc: "Every time someone queries your agent, you get paid. Passive income, on-chain.",
              },
            ].map((item) => (
              <div key={item.step} className="flex w-[240px] flex-col gap-1.5 text-left">
                <span className="text-xs font-mono text-vm-amber tracking-widest">
                  {item.step}
                </span>
                <span className="text-sm font-heading text-white font-semibold">
                  {item.title}
                </span>
                <span className="text-xs text-white/60 leading-relaxed">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </motion.footer>
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
