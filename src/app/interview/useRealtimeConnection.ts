"use client";

import { useCallback, useRef } from "react";

import { unwrap } from "@/lib/api/unwrap";

/** Refs and methods for managing the WebRTC connection lifecycle */
export interface RealtimeConnection {
  pcRef: React.RefObject<RTCPeerConnection | null>;
  dcRef: React.RefObject<RTCDataChannel | null>;
  audioElRef: React.RefObject<HTMLAudioElement | null>;
  micStreamRef: React.RefObject<MediaStream | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  animFrameRef: React.RefObject<number>;
  sessionIdRef: React.RefObject<string>;
  sessionStartRef: React.RefObject<number>;
  /** Start a WebRTC session with OpenAI Realtime API */
  connect: (opts: ConnectOptions) => Promise<void>;
  /** Tear down the WebRTC session */
  teardown: () => void;
  /** Start the animation-frame loop that reads mic levels */
  startAudioLevelLoop: (onLevel: (level: number) => void) => void;
  /** Finalize the session row via PATCH (fire-and-forget) */
  finalizeSession: (
    knowledgeCount: number,
    transcript: Array<{ role: string; text: string; ts: string }>,
  ) => Promise<void>;
}

/**
 *
 */
interface ConnectOptions {
  profileId: string;
  onDataChannelMessage: (ev: MessageEvent) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

/**
 * Manages WebRTC connection lifecycle for the OpenAI Realtime API.
 * Returns refs and imperative methods; no React state is held internally.
 */
export function useRealtimeConnection(): RealtimeConnection {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");
  const sessionStartRef = useRef<number>(0);

  const teardown = useCallback(() => {
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
  }, []);

  const startAudioLevelLoop = useCallback(
    (onLevel: (level: number) => void) => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      /**
       *
       */
      const tick = (): void => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        onLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  const finalizeSession = useCallback(
    async (
      knowledgeCount: number,
      transcript: Array<{ role: string; text: string; ts: string }>,
    ): Promise<void> => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        await fetch("/api/expertise/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            durationSeconds: Math.floor(
              (Date.now() - sessionStartRef.current) / 1000,
            ),
            knowledgeItemsAdded: knowledgeCount,
            transcript: JSON.stringify(transcript),
          }),
        });
      } catch {
        /* fire-and-forget */
      }
    },
    [],
  );

  const connect = useCallback(
    async ({
      profileId,
      onDataChannelMessage,
      onConnected,
      onDisconnected,
    }: ConnectOptions): Promise<void> => {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      /**
       *
       * @param e
       */
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
      pc.addTrack(micStream.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", onDataChannelMessage);
      /**
       *
       */
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          onDisconnected();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(
        `/api/auth/openai-realtime?profileId=${encodeURIComponent(profileId)}`,
        { method: "POST", body: offer.sdp, headers: { "Content-Type": "application/sdp" } },
      );
      if (!sdpRes.ok) throw new Error(`SDP handshake failed: ${await sdpRes.text()}`);

      const { sdp: answerSdp, sessionUpdate } = await sdpRes.json();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      dc.addEventListener("open", () => {
        dc.send(JSON.stringify(sessionUpdate));
        dc.send(JSON.stringify({ type: "response.create" }));
        onConnected();
      });

      try {
        const sessRes = await fetch("/api/expertise/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId }),
        });
        if (sessRes.ok) {
          const d = unwrap(await sessRes.json()) as { sessionId?: string };
          if (d.sessionId) sessionIdRef.current = d.sessionId;
        }
      } catch { /* best-effort */ }
      sessionStartRef.current = Date.now();
    },
    [],
  );

  return {
    pcRef,
    dcRef,
    audioElRef,
    micStreamRef,
    analyserRef,
    animFrameRef,
    sessionIdRef,
    sessionStartRef,
    connect,
    teardown,
    startAudioLevelLoop,
    finalizeSession,
  };
}
