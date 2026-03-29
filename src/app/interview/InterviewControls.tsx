"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactElement } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fadeInUp, gentle } from "@/lib/motion";

/**
 * Props for the InterviewControls component
 */
interface InterviewControlsProps {
  /** Whether the WebRTC connection is active */
  isConnected: boolean;
  /** Whether the interview is fully complete */
  isComplete: boolean;
  /** Current build stage (null when not building) */
  buildStage: string | null;
  /** Current status hint text */
  statusHint: string;
  /** Number of knowledge items from a prior session */
  initialKnowledgeCount: number;
  /** Time estimate pill text */
  timeEstimate: string;
  /** Error from agent creation, if any */
  createError: string | null;
  /** Called when start button is tapped */
  onStart: () => void;
  /** Called when end button is tapped */
  onEnd: () => void;
  /** Called when retry button is tapped after create error */
  onRetry: () => void;
}

/**
 * Central controls overlay for the interview page.
 * Shows status hint, start/end buttons, error alerts, and completion banner.
 * @param root0
 * @param root0.isConnected
 * @param root0.isComplete
 * @param root0.buildStage
 * @param root0.statusHint
 * @param root0.initialKnowledgeCount
 * @param root0.timeEstimate
 * @param root0.createError
 * @param root0.onStart
 * @param root0.onEnd
 * @param root0.onRetry
 */
export default function InterviewControls({
  isConnected,
  isComplete,
  buildStage,
  statusHint,
  initialKnowledgeCount,
  timeEstimate,
  createError,
  onStart,
  onEnd,
  onRetry,
}: InterviewControlsProps): ReactElement {
  return (
    <div className="relative z-20 flex flex-col items-center gap-5 max-w-2xl px-6">
      <motion.p
        className="text-sm text-white/60 text-center max-w-[260px]"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...gentle, delay: 0.2 }}
      >
        {statusHint}
      </motion.p>

      {!isConnected && (
        <motion.span
          className="inline-block rounded-full bg-white/5 border border-white/10
                     px-3 py-1 font-mono text-xs text-white/50"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ ...gentle, delay: 0.25 }}
        >
          {timeEstimate}
        </motion.span>
      )}

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
                onClick={onStart}
                size="lg"
                className="py-6 px-8 rounded-2xl text-base shadow-lg hover:shadow-xl
                           transition-shadow active:scale-[0.97]"
              >
                {initialKnowledgeCount > 0
                  ? "Continue Interview"
                  : "Start Interview"}
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
                onClick={onEnd}
                variant="ghost"
                className="text-white/50 hover:text-white"
              >
                End early
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {createError && (
          <motion.div
            key="create-error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={gentle}
          >
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle className="size-4 shrink-0" />
              <AlertDescription className="flex flex-col gap-3">
                <span>{createError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit border-destructive/40"
                  onClick={onRetry}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComplete && buildStage === null && (
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
  );
}
