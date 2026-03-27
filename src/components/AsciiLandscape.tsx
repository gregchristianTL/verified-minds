"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";

interface AsciiLandscapeProps {
  audioLevel: number;
  isActive: boolean;
  isComplete: boolean;
  /** User's wallet/nullifier hash — characters are drawn from this identity string */
  identity?: string;
}

const DEFAULT_DENSE = ["@", "#", "%", "&"];
const DEFAULT_MID = ["e", "c", "x", "o"];
const DEFAULT_LIGHT = [".", ":", "-", "'"];
const DEFAULT_SKY = [".", ",", "'", ":", "`", "-"];

/**
 * Splits an identity string (e.g. wallet address or nullifier hash) into
 * character buckets for the four terrain density levels.
 */
function charsFromIdentity(id: string): {
  dense: string[];
  mid: string[];
  light: string[];
  sky: string[];
} {
  const clean = id.replace(/^0x/i, "").toUpperCase();
  const chars = [...new Set(clean.split(""))];
  if (chars.length < 4) {
    return { dense: DEFAULT_DENSE, mid: DEFAULT_MID, light: DEFAULT_LIGHT, sky: DEFAULT_SKY };
  }
  const quarter = Math.ceil(chars.length / 4);
  return {
    dense: chars.slice(0, quarter),
    mid: chars.slice(quarter, quarter * 2),
    light: chars.slice(quarter * 2, quarter * 3),
    sky: chars.slice(quarter * 3),
  };
}

const CELL_SIZE = 12;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

/* Volcanic palette */
const COLOR_BASE = { r: 26, g: 14, b: 8 };
const COLOR_MID = { r: 232, g: 104, b: 48 };
const COLOR_PEAK = { r: 232, g: 184, b: 48 };
const COLOR_SKY = { r: 45, g: 24, b: 16 };
const COLOR_COMPLETE = { r: 34, g: 197, b: 94 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r},${g},${b})`;
}

/**
 * Layered sine-wave terrain. Returns a value 0..1 representing
 * "ground height" at a given column, modulated by time and audio.
 */
function terrain(col: number, cols: number, time: number, audio: number): number {
  const x = col / cols;

  const base =
    0.7 +
    Math.sin(x * Math.PI * 2.2 + 0.5) * 0.15 +
    Math.sin(x * Math.PI * 5.8 + 1.2) * 0.08 +
    Math.sin(x * Math.PI * 11.0 + 2.8) * 0.04 +
    Math.sin(x * Math.PI * 1.3 + 0.8) * 0.1;

  const breath = Math.sin(time * 0.4 + x * 3.0) * 0.02;

  const audioWave =
    Math.sin(x * Math.PI * 4.0 - time * 2.5) * audio * 0.08 +
    Math.sin(x * Math.PI * 8.0 + time * 3.2) * audio * 0.04;

  return Math.max(0.15, Math.min(1, base + breath + audioWave));
}

export default function AsciiLandscape({
  audioLevel,
  isActive,
  isComplete,
  identity,
}: AsciiLandscapeProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const levelRef = useRef(0);
  const prevLevelRef = useRef(0);

  const charSets = useMemo(() =>
    identity
      ? charsFromIdentity(identity)
      : { dense: DEFAULT_DENSE, mid: DEFAULT_MID, light: DEFAULT_LIGHT, sky: DEFAULT_SKY },
    [identity],
  );

  useEffect(() => {
    prevLevelRef.current = levelRef.current;
    levelRef.current += (audioLevel - levelRef.current) * 0.15;
  }, [audioLevel]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * DPR || canvas.height !== h * DPR) {
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(DPR, DPR);
    }

    const cols = Math.ceil(w / CELL_SIZE) + 2;
    const rows = Math.ceil(h / CELL_SIZE) + 2;
    const time = Date.now() / 1000;
    const audio = levelRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${CELL_SIZE}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = "top";

    const brightnessPulse = isActive ? 1.0 + audio * 0.4 : 0.85 + Math.sin(time * 0.6) * 0.08;

    for (let col = 0; col < cols; col++) {
      const groundHeight = terrain(col, cols, time, audio);
      const groundRow = Math.floor(rows * (1 - groundHeight));

      for (let row = 0; row < rows; row++) {
        const x = col * CELL_SIZE - CELL_SIZE;
        const y = row * CELL_SIZE - CELL_SIZE;

        if (row >= groundRow) {
          /* Ground region */
          const depth = (row - groundRow) / (rows - groundRow);
          const heightRatio = 1 - depth;

          let char: string;
          let color: string;

          if (heightRatio > 0.7) {
            char = charSets.dense[Math.floor((time * 0.3 + col * 0.7 + row * 0.5) % charSets.dense.length)];
            color = isComplete
              ? lerpColor(COLOR_COMPLETE, { r: 74, g: 222, b: 128 }, heightRatio)
              : lerpColor(COLOR_MID, COLOR_PEAK, heightRatio * brightnessPulse);
          } else if (heightRatio > 0.3) {
            char = charSets.mid[Math.floor((time * 0.2 + col * 0.9 + row * 0.3) % charSets.mid.length)];
            color = isComplete
              ? lerpColor({ r: 22, g: 100, b: 50 }, COLOR_COMPLETE, heightRatio)
              : lerpColor(COLOR_BASE, COLOR_MID, heightRatio * brightnessPulse);
          } else {
            char = charSets.light[Math.floor((col * 1.3 + row * 0.7) % charSets.light.length)];
            color = isComplete
              ? lerpColor(COLOR_BASE, { r: 22, g: 100, b: 50 }, 0.3)
              : lerpColor(COLOR_BASE, COLOR_MID, depth * 0.3 * brightnessPulse);
          }

          const audioFlicker = isActive
            ? 0.7 + audio * 0.3 + Math.sin(time * 3 + col * 0.5 + row * 0.3) * audio * 0.15
            : 0.6 + Math.sin(time * 0.8 + col * 0.3) * 0.05;

          ctx.globalAlpha = Math.min(1, audioFlicker * brightnessPulse);
          ctx.fillStyle = color;
          ctx.fillText(char, x, y);
        } else {
          /* Sky region — fill with sparse characters */
          const skyRatio = row / Math.max(groundRow, 1);
          const skyNoise =
            Math.sin(col * 0.8 + row * 1.2 + time * 0.3) *
            Math.cos(col * 0.3 - row * 0.7 + time * 0.15);

          const char = charSets.sky[Math.abs(Math.floor(col * 1.7 + row * 2.3 + time * 0.4)) % charSets.sky.length];

          /* Layered sky density: denser near the ground, sparser at top */
          const densityThreshold = isActive
            ? -0.2 + (1 - skyRatio) * 0.5 - audio * 0.3
            : 0.1 + (1 - skyRatio) * 0.4;

          if (skyNoise > densityThreshold) {
            const skyBrightness = isActive
              ? 0.06 + audio * 0.12 + skyRatio * 0.04
              : 0.03 + Math.sin(time * 0.5 + col * 0.2) * 0.015 + skyRatio * 0.03;

            ctx.globalAlpha = Math.min(0.35, skyBrightness);
            ctx.fillStyle = isComplete
              ? lerpColor(COLOR_SKY, COLOR_COMPLETE, skyRatio * 0.4)
              : lerpColor(COLOR_SKY, COLOR_MID, skyRatio * 0.5);
            ctx.fillText(char, x, y);
          }

          /* Audio ripple rings in sky during active listening */
          if (isActive && audio > 0.1) {
            const dx = col / cols - 0.5;
            const dy = row / rows - 0.6;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ripple = Math.sin(dist * 25 - time * 5) * audio;
            if (ripple > 0.3) {
              ctx.globalAlpha = ripple * 0.1;
              ctx.fillStyle = isComplete
                ? `rgb(${COLOR_COMPLETE.r},${COLOR_COMPLETE.g},${COLOR_COMPLETE.b})`
                : `rgb(${COLOR_PEAK.r},${COLOR_PEAK.g},${COLOR_PEAK.b})`;
              ctx.fillText(charSets.dense[0], x, y);
            }
          }
        }
      }
    }

    ctx.globalAlpha = 1;
    animRef.current = requestAnimationFrame(draw);
  }, [isActive, isComplete, charSets]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* Resize handler */
  useEffect(() => {
    function handleResize(): void {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
