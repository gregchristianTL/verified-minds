"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AsciiLandscape from "@/components/AsciiLandscape";
import EarningsFeed from "@/components/EarningsFeed";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, fadeInUp, scaleIn, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { Loader2, Mic } from "lucide-react";
import BalanceSheet from "@/components/BalanceSheet";
import type { SoundName } from "@/lib/sounds";

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
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState("0.00");
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [userIdentity, setUserIdentity] = useState("");
  const { play } = useSoundSystem();

  useEffect(() => {
    const profileId = sessionStorage.getItem("profileId");
    setProfileId(profileId ?? "");
    setUserIdentity(
      sessionStorage.getItem("walletAddress") ||
        sessionStorage.getItem("userId") ||
        "",
    );

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
            if (prev && newData.transactions.length > prev.transactions.length) {
              play("success");
            }
            return newData;
          });
          setBalance(parseFloat(newData.totalEarnings || "0").toFixed(2));
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [play]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center">
      {/* ASCII landscape background — static idle state */}
      <AsciiLandscape
        audioLevel={0}
        isActive={false}
        isComplete={data?.status === "live"}
        identity={userIdentity || undefined}
      />

      {/* Header — balance */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setBalanceOpen(true)}
          className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                     hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer"
        >
          <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Balance</span>
          <span className="text-sm font-heading text-white font-semibold">{balance} <span className="text-white/50">USDC</span></span>
        </button>
      </header>

      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
        ) : !data ? (
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
        ) : data.status !== "live" ? (
          <InterviewIncomplete play={play} router={router} />
        ) : (
          <AgentLive data={data} play={play} />
        )}
      </div>

      <BalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        profileId={profileId}
      />

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 z-10 py-5 px-6 text-center">
        <p className="font-mono text-xs text-white/30">
          Verified Minds v0.0.1 &middot; Built by{" "}
          <a
            href="https://tributelabs.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-[#FF00FF] transition-colors"
          >
            Tribute Labs
          </a>{" "}
          for{" "}
          <a
            href="https://world.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-colors"
          >
            World
          </a>{" "}
          x{" "}
          <a
            href="https://coinbase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-[#0052FF] transition-colors"
          >
            Coinbase
          </a>
        </p>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function InterviewIncomplete({
  play,
  router,
}: {
  play: (name: SoundName) => void;
  router: ReturnType<typeof useRouter>;
}): React.ReactElement {
  return (
    <motion.div
      className="max-w-sm w-full text-center space-y-8 backdrop-blur-lg bg-black/20 rounded-3xl px-10 py-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div className="flex justify-center" variants={scaleIn} transition={gentle}>
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Mic className="size-7 text-primary" />
        </div>
      </motion.div>

      <motion.div className="space-y-3" variants={fadeInUp} transition={gentle}>
        <h1 className="font-heading text-2xl font-medium tracking-tight text-white">
          Interview incomplete
        </h1>
        <p className="text-white/60 text-base leading-relaxed">
          Your agent needs a full conversation to go live.
          Pick up where you left off — it only takes a few more minutes.
        </p>
      </motion.div>

      <motion.div className="space-y-3" variants={fadeInUp} transition={gentle}>
        <Button
          onClick={() => {
            play("click");
            router.push("/expertise/interview");
          }}
          size="lg"
          className="w-full py-6 rounded-2xl text-base font-heading font-medium shadow-lg
                     hover:shadow-xl transition-shadow active:scale-[0.98]"
        >
          Continue Interview
        </Button>

        <Link
          href="/expertise/marketplace"
          className="block text-white/40 text-sm hover:text-primary transition-colors"
          onClick={() => play("navigate")}
        >
          Browse experts instead
        </Link>
      </motion.div>
    </motion.div>
  );
}

function AgentLive({
  data,
  play,
}: {
  data: EarningsData;
  play: (name: SoundName) => void;
}): React.ReactElement {
  return (
    <motion.div
      className="w-full max-w-md flex flex-col items-center gap-6 backdrop-blur-lg bg-black/20 rounded-3xl px-8 py-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Live badge */}
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
          <span className="font-heading text-xs">Your agent is live</span>
        </Badge>
      </motion.div>

      <motion.div variants={fadeInUp} transition={gentle} className="w-full flex justify-center">
        <EarningsFeed
          totalEarnings={data.totalEarnings}
          transactions={data.transactions}
        />
      </motion.div>

      {/* Domain tags */}
      <AnimatePresence>
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
                <Badge variant="secondary" className="font-mono text-xs">{d}</Badge>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browse marketplace link */}
      <motion.div variants={fadeInUp} transition={gentle}>
        <Link
          href="/expertise/marketplace"
          className="text-white/40 text-sm hover:text-primary transition-colors font-mono"
          onClick={() => play("navigate")}
        >
          Browse marketplace
        </Link>
      </motion.div>
    </motion.div>
  );
}
