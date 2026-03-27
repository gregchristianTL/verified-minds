"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ExpertQuery from "@/components/ExpertQuery";
import { buttonVariants } from "@/components/ui/button";
import { fadeInUp, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { ChevronLeft } from "lucide-react";

export default function QueryExpertPage(): React.ReactElement {
  const params = useParams();
  const profileId = params.agentId as string;
  const { play } = useSoundSystem();

  return (
    <motion.div
      className="w-full max-w-lg flex flex-col h-[80vh]"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={gentle}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
        <Link
          href="/expertise/marketplace"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "rounded-full" })}
          onClick={() => play("navigate")}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-medium text-foreground">Ask an Expert</h1>
          <p className="text-xs text-muted-foreground">Powered by verified human knowledge</p>
        </div>
      </div>

      <ExpertQuery profileId={profileId} />
    </motion.div>
  );
}
