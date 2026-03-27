"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface VoiceOrbProps {
  audioLevel: number;
  isActive: boolean;
  isComplete: boolean;
}

/**
 * Warm, audio-reactive orb.
 * Amber/ember when listening, gentle green when complete.
 * Adapts colors for dark mode.
 */
export default function VoiceOrb({
  audioLevel,
  isActive,
  isComplete,
}: VoiceOrbProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const levelRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    levelRef.current += (audioLevel - levelRef.current) * 0.12;
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);

    function draw(): void {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = 55;
      const level = levelRef.current;
      const pulse = baseRadius + level * 25;
      const time = Date.now() / 1000;

      const breath = isActive
        ? Math.sin(time * 1.5) * 3
        : Math.sin(time * 0.8) * 6;
      const radius = pulse + breath;

      const glowRadius = radius * 2.5;
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, glowRadius);
      const glowMul = isDark ? 1.5 : 1;

      if (isComplete) {
        glow.addColorStop(0, `rgba(34, 197, 94, ${0.12 * glowMul})`);
        glow.addColorStop(0.5, `rgba(34, 197, 94, ${0.04 * glowMul})`);
        glow.addColorStop(1, "rgba(34, 197, 94, 0)");
      } else if (isActive) {
        glow.addColorStop(0, `rgba(232, 136, 26, ${0.14 * glowMul})`);
        glow.addColorStop(0.5, `rgba(232, 136, 26, ${0.05 * glowMul})`);
        glow.addColorStop(1, "rgba(232, 136, 26, 0)");
      } else {
        glow.addColorStop(0, `rgba(232, 136, 26, ${0.08 * glowMul})`);
        glow.addColorStop(0.5, `rgba(232, 136, 26, ${0.02 * glowMul})`);
        glow.addColorStop(1, "rgba(232, 136, 26, 0)");
      }

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      ctx.beginPath();
      const smoothness = isActive ? 0.6 : 0.2;
      for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const noise =
          Math.sin(angle * 3 + time * 1.8) * level * 6 * smoothness +
          Math.sin(angle * 5 + time * 2.5) * level * 3 * smoothness +
          Math.sin(angle * 2 + time * 1.2) * 2;
        const r = radius + noise;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const orbFill = ctx.createRadialGradient(
        cx - radius * 0.2,
        cy - radius * 0.25,
        0,
        cx,
        cy,
        radius * 1.1,
      );

      const fillMul = isDark ? 1.8 : 1;

      if (isComplete) {
        orbFill.addColorStop(0, `rgba(74, 222, 128, ${0.35 * fillMul})`);
        orbFill.addColorStop(0.6, `rgba(34, 197, 94, ${0.2 * fillMul})`);
        orbFill.addColorStop(1, `rgba(22, 163, 74, ${0.1 * fillMul})`);
      } else if (isActive) {
        orbFill.addColorStop(0, `rgba(240, 160, 96, ${0.3 * fillMul})`);
        orbFill.addColorStop(0.6, `rgba(232, 136, 26, ${0.15 * fillMul})`);
        orbFill.addColorStop(1, `rgba(200, 90, 20, ${0.08 * fillMul})`);
      } else {
        orbFill.addColorStop(0, `rgba(240, 160, 96, ${0.15 * fillMul})`);
        orbFill.addColorStop(0.6, `rgba(232, 136, 26, ${0.08 * fillMul})`);
        orbFill.addColorStop(1, `rgba(200, 90, 20, ${0.03 * fillMul})`);
      }

      ctx.fillStyle = orbFill;
      ctx.fill();

      ctx.strokeStyle = isComplete
        ? `rgba(34, 197, 94, ${isDark ? 0.4 : 0.25})`
        : `rgba(232, 136, 26, ${isActive ? (isDark ? 0.35 : 0.2) : (isDark ? 0.2 : 0.1)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, isComplete, isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[280px] h-[280px]"
      style={{ imageRendering: "auto" }}
    />
  );
}
