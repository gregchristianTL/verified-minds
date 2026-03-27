"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ExpertCard from "@/components/ExpertCard";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, fadeInUp, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { Loader2 } from "lucide-react";

interface ExpertListing {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
  adinAgentId: string | null;
}

export default function MarketplacePage(): React.ReactElement {
  const [experts, setExperts] = useState<ExpertListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { play } = useSoundSystem();

  useEffect(() => {
    fetch("/api/expertise/marketplace")
      .then((r) => r.json())
      .then((data) => setExperts(data.experts ?? []))
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
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Ask a Real Expert
        </h1>
        <p className="text-muted-foreground text-sm">
          Real humans, verified by World ID. Their knowledge, your questions.
        </p>
      </motion.div>

      {experts.length === 0 ? (
        <motion.div variants={fadeInUp} transition={gentle}>
          <Card className="text-center">
            <CardContent className="py-16 px-6">
              <p className="text-foreground font-medium">No experts yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Be the first to share your expertise.
              </p>
              <Link
                href="/"
                className={buttonVariants({ className: "mt-4" })}
                onClick={() => play("click")}
              >
                Become an expert
              </Link>
            </CardContent>
          </Card>
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

      <motion.div className="text-center pt-2" variants={fadeInUp} transition={gentle}>
        <Link
          href="/"
          className="text-muted-foreground text-sm hover:text-primary transition-colors"
          onClick={() => play("navigate")}
        >
          Want to become an expert?
        </Link>
      </motion.div>
    </motion.div>
  );
}
