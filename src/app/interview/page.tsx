"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Howl } from "howler";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import AsciiLandscape from "@/components/AsciiLandscape";
import BalanceSheet from "@/components/BalanceSheet";
import ProgressBar, { INTERVIEW_PHASES } from "@/components/ProgressBar";
import { useMicStatus } from "@/hooks/useMicStatus";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { gentle } from "@/lib/motion";
import { useSoundStore } from "@/providers/SoundProvider";

import BuildStageOverlay from "./BuildStageOverlay";
import InterviewControls from "./InterviewControls";
import InterviewFooter from "./InterviewFooter";
import InterviewHeader from "./InterviewHeader";
import { dispatchToolCall } from "./toolCallDispatch";
import { useInterviewBootstrap } from "./useInterviewBootstrap";
import { useRealtimeConnection } from "./useRealtimeConnection";

/** Realtime API server event shape (subset we care about) */
interface RealtimeEvent {
  type: string;
  transcript?: string;
  event_id?: string;
  error?: { type: string; code?: string; message: string; param?: string };
  response?: {
    output?: {
      type: string;
      name?: string;
      arguments?: string;
      call_id?: string;
    }[];
  };
}

const TARGET_KNOWLEDGE_ITEMS = 5;
const TOTAL_INTERVIEW_MINUTES = 3;

/**
 * Estimate minutes left based on knowledge items extracted so far
 * @param knowledgeCount
 */
function estimateMinutesRemaining(knowledgeCount: number): number {
  const pct = Math.min(knowledgeCount / TARGET_KNOWLEDGE_ITEMS, 0.95);
  return Math.max(1, Math.ceil(TOTAL_INTERVIEW_MINUTES * (1 - pct)));
}

/**
 * InterviewPage - Voice interview with ADIN via OpenAI Realtime API.
 *
 * Orchestrates the multi-phase interview flow. Heavy lifting is delegated to:
 * - useInterviewBootstrap: profile/earnings/phase seeding
 * - useRealtimeConnection: WebRTC lifecycle
 * - dispatchToolCall: API tool call dispatch
 */
// eslint-disable-next-line max-lines-per-function -- page orchestrator; logic is in hooks/subcomponents
export default function InterviewPage(): React.ReactElement {
  const router = useRouter();
  const { play } = useSoundSystem();
  const isMuted = useSoundStore((s) => s.isMuted);
  const { micPermission, deviceMuted, showMicAlert } = useMicStatus();
  const rtc = useRealtimeConnection();
  const bs = useInterviewBootstrap(() => router.push("/"));

  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [buildStage, setBuildStage] = useState<
    "saving" | "analyzing" | "building" | "live" | null
  >(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{
    topic: string;
    domain: string;
  } | null>(null);

  const transcriptRef = useRef<Array<{ role: string; text: string; ts: string }>>([]);
  const knowledgeCountRef = useRef(0);
  const createAgentArgsRef = useRef<{
    name: string;
    args: string;
    callId: string;
  } | null>(null);
  const buildTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDomainsRef = useRef<Set<string>>(new Set());
  const ambientRef = useRef<Howl | null>(null);

  useEffect(() => {
    knowledgeCountRef.current = bs.knowledgeCount;
  }, [bs.knowledgeCount]);

  useEffect(() => {
    return () => {
      buildTimeoutsRef.current.forEach(clearTimeout);
      if (lastSavedTimerRef.current) clearTimeout(lastSavedTimerRef.current);
    };
  }, []);

  // ── Ambient sound ───────────────────────────────────────────────────
  useEffect(() => {
    if (isConnected && !isMuted && !ambientRef.current) {
      const ambient = new Howl({ src: ["/sounds/navigate.mp3"], loop: true, volume: 0 });
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
      ambientRef.current.volume(0.04 + audioLevel * 0.08);
    }
  }, [audioLevel, isConnected]);

  // ── Tool call handler ───────────────────────────────────────────────
  const handleToolCall = useCallback(
    async (name: string, args: string, callId: string): Promise<void> => {
      if (name === "create_agent") createAgentArgsRef.current = { name, args, callId };
      bs.setStatusHint(
        name === "save_knowledge" ? "Saving an insight..."
          : name === "assess_expertise" ? "Assessing your expertise..."
            : name === "fetch_link" ? "Reading your link..."
              : "Building your agent...",
      );

      let result: Record<string, unknown>;
      try {
        const fx = await dispatchToolCall(name, args, bs.profileIdRef.current, rtc.sessionIdRef.current);
        result = fx.result;
        if (fx.knowledgeDelta) bs.setKnowledgeCount((c) => c + (fx.knowledgeDelta ?? 0));
        if (fx.progressDelta) bs.setProgress((p) => Math.min(p + (fx.progressDelta ?? 0), 95));
        if (fx.sound) play(fx.sound);
        if (fx.statusHint) bs.setStatusHint(fx.statusHint);
        if (fx.savedItem) {
          savedDomainsRef.current.add(fx.savedItem.domain);
          setLastSaved(fx.savedItem);
          if (lastSavedTimerRef.current) clearTimeout(lastSavedTimerRef.current);
          lastSavedTimerRef.current = setTimeout(() => setLastSaved(null), 3000);
        }
        if (fx.completedPhase) {
          const phase = fx.completedPhase;
          bs.setCompletedPhases((prev) => new Set([...prev, phase]));
          const idx = INTERVIEW_PHASES.findIndex((p) => p.id === phase);
          if (idx >= 0 && idx < INTERVIEW_PHASES.length - 1) {
            bs.setCurrentPhase(INTERVIEW_PHASES[idx + 1].id);
          }
        }
        if (fx.createError) setCreateError(fx.createError);
        if (fx.agentCreated) {
          void rtc.finalizeSession(knowledgeCountRef.current, transcriptRef.current);
          buildTimeoutsRef.current.forEach(clearTimeout);
          buildTimeoutsRef.current = [
            setTimeout(() => setBuildStage("analyzing"), 2500),
            setTimeout(() => setBuildStage("building"), 5000),
            setTimeout(() => setBuildStage("live"), 7500),
            setTimeout(() => {
              sessionStorage.setItem("agentJustCreated", "true");
              router.push("/done");
            }, 10000),
          ];
          setCreateError(null);
          setIsComplete(true);
          bs.setProgress(100);
          bs.setCompletedPhases(new Set(INTERVIEW_PHASES.map((p) => p.id)));
          setBuildStage("saving");
        }
      } catch (err) {
        result = { error: err instanceof Error ? err.message : "Tool call failed" };
      }

      const dc = rtc.dcRef.current;
      if (dc?.readyState === "open") {
        dc.send(JSON.stringify({
          type: "conversation.item.create",
          item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
        }));
        dc.send(JSON.stringify({ type: "response.create" }));
      }
    },
    [router, play, rtc, bs],
  );

  // ── Data channel event router ───────────────────────────────────────
  const onDataChannelMessage = useCallback(
    (ev: MessageEvent): void => {
      const event: RealtimeEvent = JSON.parse(ev.data);
      switch (event.type) {
        case "input_audio_buffer.speech_started":
          setAudioLevel(0.6);
          bs.setStatusHint("Listening...");
          break;
        case "input_audio_buffer.speech_stopped":
          setAudioLevel(0.1);
          break;
        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript) {
            transcriptRef.current.push({ role: "user", text: event.transcript, ts: new Date().toISOString() });
          }
          break;
        case "response.audio_transcript.done":
          if (event.transcript) {
            transcriptRef.current.push({ role: "assistant", text: event.transcript, ts: new Date().toISOString() });
          }
          break;
        case "response.output_audio_transcript.delta":
          bs.setStatusHint("ADIN is speaking...");
          setAudioLevel(0.4);
          break;
        case "response.done": {
          bs.setStatusHint("ADIN is listening — just talk naturally");
          setAudioLevel(0.1);
          for (const item of event.response?.output ?? []) {
            if (item.type === "function_call" && item.name && item.arguments && item.call_id) {
              handleToolCall(item.name, item.arguments, item.call_id);
            }
          }
          break;
        }
        case "error":
          console.error("[realtime] Server error:", event.error?.message ?? JSON.stringify(event));
          bs.setStatusHint("Connection error — tap to retry");
          break;
        default:
          break;
      }
    },
    [handleToolCall, bs],
  );

  /** Start the interview WebRTC session */
  async function handleStart(): Promise<void> {
    try {
      play("click");
      bs.setStatusHint("Connecting...");
      await rtc.connect({
        profileId: bs.profileIdRef.current,
        onDataChannelMessage,
        /**
         *
         */
        onConnected: () => {
          bs.setStatusHint("ADIN is introducing itself...");
          setIsConnected(true);
          rtc.startAudioLevelLoop(setAudioLevel);
        },
        /**
         *
         */
        onDisconnected: () => {
          bs.setStatusHint("Connection lost — tap to reconnect");
          setIsConnected(false);
          play("error");
        },
      });
    } catch (err) {
      console.error("[interview] Connection failed:", err);
      bs.setStatusHint("Connection failed — tap to retry");
      play("error");
    }
  }

  /** End the interview and navigate to the done page */
  async function handleEnd(): Promise<void> {
    play("click");
    await rtc.finalizeSession(knowledgeCountRef.current, transcriptRef.current);
    buildTimeoutsRef.current.forEach(clearTimeout);
    buildTimeoutsRef.current = [];
    rtc.teardown();
    setIsConnected(false);
    router.push("/done");
  }

  useEffect(() => {
    return () => rtc.teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center pt-20 md:pt-24 pb-16 md:pb-20 bg-black">
      <AsciiLandscape
        audioLevel={audioLevel}
        isActive={isConnected}
        isComplete={isComplete}
        identity={bs.userIdentity || undefined}
      />
      <InterviewHeader
        balance={bs.balance}
        deviceMuted={deviceMuted}
        showMicAlert={showMicAlert}
        micPermission={micPermission}
        onBalanceClick={() => setBalanceOpen(true)}
      />
      <InterviewControls
        isConnected={isConnected}
        isComplete={isComplete}
        buildStage={buildStage}
        statusHint={bs.statusHint}
        initialKnowledgeCount={bs.initialKnowledgeCount}
        timeEstimate={
          bs.initialKnowledgeCount > 0
            ? `~${estimateMinutesRemaining(bs.initialKnowledgeCount)} min remaining`
            : `~${TOTAL_INTERVIEW_MINUTES} min`
        }
        createError={createError}
        onStart={handleStart}
        onEnd={handleEnd}
        onRetry={() => {
          const stored = createAgentArgsRef.current;
          if (!stored) return;
          setCreateError(null);
          void handleToolCall(stored.name, stored.args, stored.callId);
        }}
      />
      <AnimatePresence>
        {isConnected && !isComplete && buildStage === null && (
          <motion.div
            key="interview-progress"
            className="fixed bottom-8 left-1/2 z-30 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={gentle}
          >
            <ProgressBar
              progress={bs.progress}
              itemCount={bs.knowledgeCount}
              estimatedMinutes={estimateMinutesRemaining(bs.knowledgeCount)}
              currentPhase={bs.currentPhase}
              completedPhases={bs.completedPhases}
              lastSaved={lastSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <BuildStageOverlay
        stage={buildStage}
        knowledgeCount={bs.knowledgeCount}
        domainCount={savedDomainsRef.current.size}
      />
      <BalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        profileId={bs.profileIdRef.current}
      />
      <InterviewFooter
        isConnected={isConnected}
        initialKnowledgeCount={bs.initialKnowledgeCount}
        estimatedMinutesRemaining={estimateMinutesRemaining(bs.initialKnowledgeCount)}
      />
    </div>
  );
}
