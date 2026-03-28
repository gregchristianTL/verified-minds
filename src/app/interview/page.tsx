"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import AsciiLandscape from "@/components/AsciiLandscape";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fadeInUp, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { useSoundStore } from "@/providers/SoundProvider";
import { CheckCircle2, AlertTriangle, Mic } from "lucide-react";
import BalanceSheet from "@/components/BalanceSheet";

/** Realtime API server event shape (subset we care about) */
interface RealtimeEvent {
  type: string;
  event_id?: string;
  response?: {
    output?: {
      type: string;
      name?: string;
      arguments?: string;
      call_id?: string;
    }[];
  };
}

export default function InterviewPage(): React.ReactElement {
  const router = useRouter();
  const { play } = useSoundSystem();
  const isMuted = useSoundStore((s) => s.isMuted);

  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusHint, setStatusHint] = useState("Tap to begin your interview");
  const [userIdentity, setUserIdentity] = useState<string>("");
  const [balance, setBalance] = useState<string>("0.00");
  const [micPermission, setMicPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [deviceMuted, setDeviceMuted] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const profileIdRef = useRef<string>("");
  const ambientRef = useRef<Howl | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // ── Bootstrap: load profileId, wallet, balance ──────────────────────
  useEffect(() => {
    profileIdRef.current = sessionStorage.getItem("profileId") ?? "";
    setUserIdentity(
      sessionStorage.getItem("walletAddress") ||
        sessionStorage.getItem("userId") ||
        "",
    );
    if (!profileIdRef.current) {
      router.push("/");
      return;
    }

    fetch(`/api/expertise/earnings?profileId=${profileIdRef.current}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.totalEarnings) {
          setBalance(parseFloat(data.totalEarnings).toFixed(2));
        }
      })
      .catch(() => {});
  }, [router]);

  // ── Microphone permission check ─────────────────────────────────────
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

  // ── Device-muted detection (silent AudioContext probe) ──────────────
  useEffect(() => {
    async function checkMuted(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
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

  // ── Ambient sound tied to connection state ──────────────────────────
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

  // ── Ambient volume reacts to audio level ────────────────────────────
  useEffect(() => {
    if (ambientRef.current && isConnected) {
      const targetVol = 0.04 + audioLevel * 0.08;
      ambientRef.current.volume(targetVol);
    }
  }, [audioLevel, isConnected]);

  // ── Mic audio-level loop (feeds AsciiLandscape) ─────────────────────
  const startAudioLevelLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = (): void => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setAudioLevel(avg / 255);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Tool call handler ────────────────────────────────────────────────
  const handleToolCall = useCallback(
    async (name: string, args: string, callId: string) => {
      const params = JSON.parse(args);
      const profileId = profileIdRef.current;
      let result: Record<string, unknown> = {};

      try {
        switch (name) {
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
            setTimeout(() => router.push("/done"), 3000);
            break;
          }
          default:
            result = { error: `Unknown tool: ${name}` };
        }
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : "Tool call failed",
        };
      }

      // Return tool result to the model, then trigger its next response
      const dc = dcRef.current;
      if (dc?.readyState === "open") {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify(result),
            },
          }),
        );
        dc.send(JSON.stringify({ type: "response.create" }));
      }
    },
    [router, play],
  );

  // ── Data channel event router ───────────────────────────────────────
  const onDataChannelMessage = useCallback(
    (ev: MessageEvent) => {
      const event: RealtimeEvent = JSON.parse(ev.data);

      switch (event.type) {
        case "input_audio_buffer.speech_started":
          setAudioLevel(0.6);
          setStatusHint("Listening...");
          break;

        case "input_audio_buffer.speech_stopped":
          setAudioLevel(0.1);
          break;

        case "response.output_audio_transcript.delta":
          setStatusHint("ADIN is speaking...");
          setAudioLevel(0.4);
          break;

        case "response.done": {
          setStatusHint("ADIN is listening — just talk naturally");
          setAudioLevel(0.1);

          // Check for function calls in the response output
          const outputs = event.response?.output ?? [];
          for (const item of outputs) {
            if (
              item.type === "function_call" &&
              item.name &&
              item.arguments &&
              item.call_id
            ) {
              handleToolCall(item.name, item.arguments, item.call_id);
            }
          }
          break;
        }

        case "error":
          console.error("[realtime] Server error:", event);
          break;

        default:
          break;
      }
    },
    [handleToolCall],
  );

  // ── Start interview: WebRTC + data channel ──────────────────────────
  async function handleStart(): Promise<void> {
    try {
      play("click");
      setStatusHint("Connecting...");

      // Acquire mic
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStreamRef.current = micStream;

      // Set up AnalyserNode for live audio-level visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio playback
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // Add mic track
      pc.addTrack(micStream.getTracks()[0]);

      // Data channel for Realtime API events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", onDataChannelMessage);

      // SDP offer → our server → OpenAI → answer SDP + session config
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const profileId = profileIdRef.current;
      const sdpResponse = await fetch(
        `/api/auth/openai-realtime?profileId=${encodeURIComponent(profileId)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: { "Content-Type": "application/sdp" },
        },
      );

      if (!sdpResponse.ok) {
        const errBody = await sdpResponse.text();
        throw new Error(`SDP handshake failed: ${errBody}`);
      }

      const { sdp: answerSdp, sessionUpdate } = await sdpResponse.json();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // Once the data channel opens, send session config (instructions, tools, etc.)
      dc.addEventListener("open", () => {
        dc.send(JSON.stringify(sessionUpdate));
        setStatusHint("ADIN is listening — just talk naturally");
      });

      // Fetch existing progress for resume sessions
      try {
        const ctxRes = await fetch(
          `/api/expertise/earnings?profileId=${profileId}`,
        );
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          const count = ctxData.transactions?.length ?? 0;
          if (count > 0) {
            setKnowledgeCount(count);
            setProgress(Math.min(count * 5, 60));
          }
        }
      } catch {
        // Non-critical — just skip resume context on the UI side
      }

      setIsConnected(true);
      startAudioLevelLoop();
    } catch (err) {
      console.error("[interview] Connection failed:", err);
      setStatusHint("Connection failed — tap to retry");
      play("error");
    }
  }

  // ── End interview: tear down WebRTC ─────────────────────────────────
  function handleEnd(): void {
    play("click");
    teardown();
    setIsConnected(false);
    router.push("/done");
  }

  function teardown(): void {
    cancelAnimationFrame(animFrameRef.current);
    dcRef.current?.close();
    pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    dcRef.current = null;
    pcRef.current = null;
    micStreamRef.current = null;
    analyserRef.current = null;
  }

  useEffect(() => {
    return () => teardown();
  }, []);

  const showMicAlert =
    micPermission === "denied" || micPermission === "prompt";

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
          <span className="text-sm font-heading text-white font-normal tracking-tight">
            Verified Minds
          </span>
          <span className="text-sm font-heading text-white/30 font-semibold tracking-tight">
            v0.1.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBalanceOpen(true)}
            className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                       hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer"
          >
            <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
              Balance
            </span>
            <span className="text-sm font-heading text-white font-semibold">
              {balance} <span className="text-white/50">USDC</span>
            </span>
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
                <span>
                  {micPermission === "denied" ? "Mic blocked" : "Mic required"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>


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
              <div
                key={item.step}
                className="flex w-[240px] flex-col gap-1.5 text-left"
              >
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
