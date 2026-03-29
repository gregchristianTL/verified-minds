"use client";

import { useEffect, useState } from "react";

/** Browser microphone permission state */
type MicPermission = "granted" | "denied" | "prompt" | "unknown";

/**
 * Return type for the useMicStatus hook
 */
interface MicStatus {
  /** Current browser mic permission */
  micPermission: MicPermission;
  /** True when mic has permission but the hardware is producing silence (system mute) */
  deviceMuted: boolean;
  /** True when the user should be alerted (denied or prompt) */
  showMicAlert: boolean;
}

/**
 * Tracks microphone permission and detects system-level muting.
 *
 * Runs a brief audio probe when permission is "granted" to determine
 * whether the mic is actually producing signal or is hardware-muted.
 */
export function useMicStatus(): MicStatus {
  const [micPermission, setMicPermission] =
    useState<MicPermission>("unknown");
  const [deviceMuted, setDeviceMuted] = useState(false);

  useEffect(() => {
    if (!navigator.permissions) {
      setMicPermission("unknown");
      return;
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        setMicPermission(status.state as MicPermission);
        /**
         *
         */
        status.onchange = () => {
          setMicPermission(status.state as MicPermission);
        };
      })
      .catch(() => setMicPermission("unknown"));
  }, []);

  useEffect(() => {
    if (micPermission !== "granted") return;

    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        let silentFrames = 0;
        let totalFrames = 0;
        const requiredFrames = 15;

        interval = setInterval(() => {
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
        }, 100);

        timeout = setTimeout(() => cleanup(), 2000);
      } catch {
        // getUserMedia failed — mic permission alert handles this
      }
    })();

    /**
     *
     */
    function cleanup(): void {
      clearInterval(interval);
      clearTimeout(timeout);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    }

    return cleanup;
  }, [micPermission]);

  return {
    micPermission,
    deviceMuted,
    showMicAlert: micPermission === "denied" || micPermission === "prompt",
  };
}
