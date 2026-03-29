"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactElement } from "react";

import { fadeInUp, gentle, scaleIn } from "@/lib/motion";

/**
 * Props for the BuildStageOverlay component
 */
interface BuildStageOverlayProps {
  /** Current build stage, or null when not building */
  stage: "saving" | "analyzing" | "building" | "live" | null;
  /** Number of knowledge items extracted */
  knowledgeCount: number;
  /** Number of unique domains covered */
  domainCount: number;
}

/**
 * Full-screen overlay shown during the agent build sequence.
 * Progresses through: saving -> analyzing -> building -> live.
 * @param root0
 * @param root0.stage
 * @param root0.knowledgeCount
 * @param root0.domainCount
 */
export default function BuildStageOverlay({
  stage,
  knowledgeCount,
  domainCount,
}: BuildStageOverlayProps): ReactElement | null {
  if (stage === null) return null;

  const stageLabel =
    stage === "saving"
      ? "Saving your expertise..."
      : stage === "analyzing"
        ? "Analyzing your knowledge..."
        : stage === "building"
          ? "Building your agent..."
          : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          className="pointer-events-none text-center px-6 space-y-3"
          variants={{
            ...fadeInUp,
            exit: { opacity: 0, y: -12 },
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={gentle}
        >
          {stage === "live" ? (
            <>
              <motion.p
                className="text-lg font-heading font-semibold text-vm-success"
                variants={scaleIn}
                initial="initial"
                animate="animate"
                transition={gentle}
              >
                Your agent is live!
              </motion.p>
              <p className="text-sm text-white/50 font-mono">
                Redirecting to your profile...
              </p>
            </>
          ) : (
            <>
              <motion.p
                className="text-lg font-heading font-semibold text-white/90"
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {stageLabel}
              </motion.p>
              <p className="text-xs text-white/40 font-mono">
                {knowledgeCount} insight{knowledgeCount !== 1 ? "s" : ""} across{" "}
                {domainCount || 1} domain{domainCount !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
