"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import ExpertCard from "@/components/ExpertCard";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { unwrap } from "@/lib/api/unwrap";
import { fadeInUp, gentle,staggerContainer } from "@/lib/motion";

/**
 *
 */
interface ExpertListing {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
  adinAgentId: string | null;
}

/**
 *
 */
export default function MarketplacePage(): React.ReactElement {
  const [experts, setExperts] = useState<ExpertListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { play } = useSoundSystem();

  useEffect(() => {
    fetch("/api/expertise/marketplace")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const data = unwrap(json);
        setExperts(data.experts ?? []);
      })
      .catch((err: unknown) => {
        console.error("Failed to load marketplace:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-lg space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div className="text-center space-y-2" variants={fadeInUp} transition={gentle}>
        <h1
          className="font-heading text-3xl font-bold tracking-tight text-white"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
        >
          Ask a Real Expert
        </h1>
        <p
          className="text-white/60 text-sm"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
        >
          Real humans, verified by World ID. Their knowledge, your questions.
        </p>
      </motion.div>

      {experts.length === 0 ? (
        <motion.div variants={fadeInUp} transition={gentle}>
          <div className="text-center backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl py-16 px-6">
            <p className="text-white font-medium">No experts yet</p>
            <p className="text-white/50 text-sm mt-1">
              Be the first to share your expertise.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-5 mt-4 rounded-2xl
                         bg-primary text-primary-foreground font-heading font-medium text-sm
                         shadow-lg hover:shadow-[0_0_30px_rgba(232,104,48,0.35)]
                         transition-all active:scale-[0.97]"
              onClick={() => play("click")}
            >
              Become an expert
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div className="space-y-3" variants={staggerContainer}>
          {experts.map((expert, i) => (
            <motion.div
              key={expert.id}
              variants={fadeInUp}
              transition={{ ...gentle, delay: i * 0.08 }}
            >
              <ExpertCard
                id={expert.id}
                displayName={expert.displayName}
                bio={expert.bio}
                domains={expert.domains}
                queryPrice={expert.queryPrice}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div className="text-center pt-2 space-y-2" variants={fadeInUp} transition={gentle}>
        <Link
          href="/"
          className="text-white/40 text-sm hover:text-primary transition-colors block"
          onClick={() => play("navigate")}
        >
          Want to become an expert?
        </Link>
        <Link
          href="/swarm"
          className="text-white/30 text-xs hover:text-white/60 transition-colors block"
          onClick={() => play("navigate")}
        >
          Or launch a swarm to tackle complex tasks
        </Link>
      </motion.div>
    </motion.div>
  );
}
