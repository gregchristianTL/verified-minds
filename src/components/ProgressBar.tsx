"use client";

import type { ReactElement } from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  itemCount: number;
  estimatedMinutes?: number;
}

export default function ProgressBar({
  progress,
  itemCount,
  estimatedMinutes,
}: ProgressBarProps): ReactElement {
  const clamped = Math.min(progress, 100);
  const isDone = clamped >= 100;

  const topLine =
    isDone
      ? "Your agent is ready!"
      : estimatedMinutes !== undefined
        ? `~${estimatedMinutes} min remaining`
        : "";

  return (
    <div className="w-64 space-y-2">
      <p className="text-center text-sm font-medium text-white/50">
        {topLine}
      </p>

      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDone ? "bg-vm-success" : "bg-white/30"}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      <p className="text-center text-xs text-white/40">
        {itemCount > 0
          ? `${itemCount} insight${itemCount !== 1 ? "s" : ""} captured`
          : "Listening..."}
      </p>
    </div>
  );
}
