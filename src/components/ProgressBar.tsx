"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  itemCount: number;
}

const PHASES = [
  { min: 0, label: "Getting to know you" },
  { min: 15, label: "Exploring your expertise" },
  { min: 40, label: "Finding the gold" },
  { min: 70, label: "Refining your agent" },
  { min: 90, label: "Almost there..." },
  { min: 100, label: "Your agent is ready!" },
];

function getPhaseLabel(progress: number): string {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (progress >= PHASES[i].min) return PHASES[i].label;
  }
  return PHASES[0].label;
}

export default function ProgressBar({
  progress,
  itemCount,
}: ProgressBarProps): React.ReactElement {
  const clamped = Math.min(progress, 100);
  const isDone = clamped >= 100;

  return (
    <div className="w-72 space-y-2.5">
      <p className="text-center text-sm font-medium text-foreground">
        {getPhaseLabel(clamped)}
      </p>

      <div className="h-2 w-full rounded-full bg-border overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${clamped}%`,
            backgroundColor: isDone
              ? "var(--vm-success)"
              : "var(--vm-accent)",
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {itemCount > 0
          ? `${itemCount} insight${itemCount !== 1 ? "s" : ""} captured`
          : "Listening..."}
      </p>
    </div>
  );
}
