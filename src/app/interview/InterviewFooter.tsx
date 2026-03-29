"use client";

import { motion } from "framer-motion";
import type { ReactElement } from "react";

import { fadeInUp, gentle } from "@/lib/motion";

/**
 * Props for the InterviewFooter component
 */
interface InterviewFooterProps {
  /** Whether the interview is currently connected */
  isConnected: boolean;
  /** Number of knowledge items from a prior session (drives copy) */
  initialKnowledgeCount: number;
  /** Estimated minutes remaining for a returning user */
  estimatedMinutesRemaining: number;
}

/**
 * 3-step explainer footer shown before the interview starts.
 * Visible on both desktop and mobile.
 * @param root0
 * @param root0.isConnected
 * @param root0.initialKnowledgeCount
 * @param root0.estimatedMinutesRemaining
 */
export default function InterviewFooter({
  isConnected,
  initialKnowledgeCount,
  estimatedMinutesRemaining,
}: InterviewFooterProps): ReactElement | null {
  if (isConnected) return null;

  const steps = [
    {
      step: "01",
      title: "Talk",
      desc:
        initialKnowledgeCount > 0
          ? `Pick up where you left off. ~${estimatedMinutesRemaining} min to go.`
          : "ADIN interviews you about your expertise. ~3 min, just a conversation.",
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
  ];

  return (
    <motion.footer
      className="fixed bottom-0 left-0 right-0 z-5 px-6 md:px-8 pb-8 md:pb-12 pt-16
                 bg-linear-to-t from-black/80 to-transparent pointer-events-none"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ ...gentle, delay: 0.25 }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-3xl mx-auto justify-between gap-4 md:gap-0">
        {steps.map((item) => (
          <div
            key={item.step}
            className="flex flex-1 max-w-[240px] flex-col gap-1.5 text-left"
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
  );
}
