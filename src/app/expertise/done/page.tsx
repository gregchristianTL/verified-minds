"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import EarningsFeed from "@/components/EarningsFeed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { staggerContainer, fadeInUp, scaleIn, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { Loader2 } from "lucide-react";

interface EarningsData {
  totalEarnings: string;
  displayName: string;
  domains: string[];
  status: string;
  transactions: Array<{
    id: string;
    querySummary: string | null;
    domainTag: string | null;
    amount: number;
    txHash: string | null;
    createdAt: string;
  }>;
}

export default function DonePage(): React.ReactElement {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { play } = useSoundSystem();

  useEffect(() => {
    const profileId = sessionStorage.getItem("profileId");
    if (!profileId) {
      setLoading(false);
      return;
    }

    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/expertise/earnings?profileId=${profileId}`,
        );
        if (res.ok) {
          const newData: EarningsData = await res.json();
          setData((prev) => {
            // Play success sound when new transactions arrive
            if (prev && newData.transactions.length > prev.transactions.length) {
              play("success");
            }
            return newData;
          });
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [play]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={gentle}
      >
        <Card className="text-center">
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">No profile found.</p>
            <Link href="/expertise" className={buttonVariants({ variant: "link" })}>
              Get started
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full flex flex-col items-center gap-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Live badge */}
      {data.status === "live" && (
        <motion.div variants={scaleIn} transition={gentle}>
          <Badge
            variant="secondary"
            className="gap-2 px-3.5 py-1.5 rounded-full bg-vm-success-bg text-vm-success border-0"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-vm-success"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            Your agent is live
          </Badge>
        </motion.div>
      )}

      <motion.div variants={fadeInUp} transition={gentle} className="w-full flex justify-center">
        <EarningsFeed
          totalEarnings={data.totalEarnings}
          transactions={data.transactions}
        />
      </motion.div>

      {/* Domain tags */}
      {data.domains.length > 0 && (
        <motion.div
          className="flex flex-wrap gap-2 justify-center"
          variants={fadeInUp}
          transition={gentle}
        >
          {data.domains.map((d, i) => (
            <motion.div
              key={d}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05, ...gentle }}
            >
              <Badge variant="secondary">{d}</Badge>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
