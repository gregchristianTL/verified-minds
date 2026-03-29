"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactElement } from "react";

/** Interview phases in order, matching the 3-phase profiler prompt */
export const INTERVIEW_PHASES = [
  { id: "intro_domain", label: "Intro" },
  { id: "unique_signal", label: "Signal" },
  { id: "wrap", label: "Build" },
] as const;

export type PhaseId = (typeof INTERVIEW_PHASES)[number]["id"];

/**
 * Props for the ProgressBar component
 */
interface ProgressBarProps {
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Number of knowledge items extracted so far */
  itemCount: number;
  /** Estimated minutes remaining */
  estimatedMinutes?: number;
  /** Currently active interview phase */
  currentPhase?: PhaseId;
  /** Set of completed phase IDs */
  completedPhases?: ReadonlySet<string>;
  /** Last saved knowledge item (briefly shown as confirmation) */
  lastSaved?: { topic: string; domain: string } | null;
}

/**
 * Interview progress bar with phase journey stepper.
 * Shows the user exactly where they are in the 3-phase interview process,
 * with live insight count and save confirmations.
 */
export default function ProgressBar({
  progress,
  itemCount,
  estimatedMinutes,
  currentPhase = "intro_domain",
  completedPhases = new Set(),
  lastSaved = null,
}: ProgressBarProps): ReactElement {
  const clamped = Math.min(progress, 100);
  const isDone = clamped >= 100;
  const currentIdx = INTERVIEW_PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className="w-80 space-y-3 backdrop-blur-md bg-black/40 rounded-2xl px-5 py-4 border border-white/10">
      {/* Phase stepper */}
      <div className="flex items-center justify-between gap-1">
        {INTERVIEW_PHASES.map((phase, i) => {
          const isCompleted = completedPhases.has(phase.id);
          const isCurrent = phase.id === currentPhase;

          return (
            <div key={phase.id} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`
                  size-5 rounded-full flex items-center justify-center text-[9px] font-mono transition-all duration-500
                  ${isCompleted ? "bg-vm-success text-black" : ""}
                  ${isCurrent && !isCompleted ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                  ${!isCurrent && !isCompleted ? "bg-white/10 text-white/30" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[9px] font-mono leading-none transition-colors duration-300
                  ${isCurrent ? "text-white/80" : isCompleted ? "text-vm-success/60" : "text-white/25"}
                `}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isDone ? "bg-vm-success" : "bg-primary/80"}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-white/50">
          {isDone
            ? "Interview complete"
            : `${itemCount} insight${itemCount !== 1 ? "s" : ""} captured`}
        </span>
        {!isDone && estimatedMinutes !== undefined && (
          <span className="text-white/35">~{estimatedMinutes} min left</span>
        )}
      </div>

      {/* Save confirmation (briefly appears when a knowledge item is saved) */}
      <AnimatePresence>
        {lastSaved && (
          <motion.div
            className="flex items-center gap-1.5 text-[10px] text-vm-success/80 font-mono"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="size-3 shrink-0" />
            <span className="truncate">
              Saved: {lastSaved.topic}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
