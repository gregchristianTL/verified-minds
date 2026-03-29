"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fadeInUp, gentle, scaleIn, staggerContainer } from "@/lib/motion";
import type { SoundName } from "@/lib/sounds";

/**
 * Props for InterviewIncomplete
 */
interface InterviewIncompleteProps {
  play: (name: SoundName) => void;
  router: AppRouterInstance;
}

/**
 * Shown when the user's interview is not yet complete.
 * Prompts them to continue the conversation.
 * @param root0
 * @param root0.play
 * @param root0.router
 */
export default function InterviewIncomplete({
  play,
  router,
}: InterviewIncompleteProps): React.ReactElement {
  return (
    <motion.div
      className="max-w-sm w-full text-center space-y-8 backdrop-blur-lg bg-black/20 rounded-3xl px-10 py-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="flex justify-center"
        variants={scaleIn}
        transition={gentle}
      >
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Mic className="size-7 text-primary" />
        </div>
      </motion.div>

      <motion.div
        className="space-y-3"
        variants={fadeInUp}
        transition={gentle}
      >
        <h1 className="font-heading text-2xl font-medium tracking-tight text-white">
          Interview incomplete
        </h1>
        <p className="text-white/60 text-base leading-relaxed">
          Your agent needs a full conversation to go live. Pick up where you left
          off — it only takes a few more minutes.
        </p>
      </motion.div>

      <motion.div
        className="space-y-3"
        variants={fadeInUp}
        transition={gentle}
      >
        <Button
          onClick={() => {
            play("click");
            router.push("/interview");
          }}
          size="lg"
          className="w-full py-6 rounded-2xl text-base font-heading font-medium shadow-lg
                     hover:shadow-xl transition-shadow active:scale-[0.98]"
        >
          Continue Interview
        </Button>

        <Link
          href="/marketplace"
          className="block text-white/40 text-sm hover:text-primary transition-colors"
          onClick={() => play("navigate")}
        >
          Browse experts instead
        </Link>
      </motion.div>
    </motion.div>
  );
}
