"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AsciiLandscape from "@/components/AsciiLandscape";
import BalanceSheet from "@/components/BalanceSheet";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { unwrap } from "@/lib/api/unwrap";
import { gentle } from "@/lib/motion";

import AgentLive, { type EarningsData, type ProfileData } from "./AgentLive";
import InterviewIncomplete from "./InterviewIncomplete";

/**
 * DonePage - Post-interview dashboard.
 *
 * Shows one of three states:
 * 1. Interview incomplete -- prompt to continue
 * 2. Agent live -- identity, earnings, marketplace link
 * 3. No profile -- redirect to onboarding
 */
// eslint-disable-next-line max-lines-per-function -- page orchestrator with data fetching
export default function DonePage(): React.ReactElement {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState("0.00");
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [userIdentity, setUserIdentity] = useState("");
  const [celebrateEntrance, setCelebrateEntrance] = useState(false);
  const { play } = useSoundSystem();

  useEffect(() => {
    if (sessionStorage.getItem("agentJustCreated")) {
      setCelebrateEntrance(true);
      const t = window.setTimeout(() => {
        sessionStorage.removeItem("agentJustCreated");
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const rawProfileId = sessionStorage.getItem("profileId");
    const pid =
      rawProfileId && rawProfileId !== "undefined" ? rawProfileId : "";
    setProfileId(pid);
    setUserIdentity(
      sessionStorage.getItem("walletAddress") ||
        sessionStorage.getItem("userId") ||
        "",
    );

    if (!pid) {
      setLoading(false);
      return;
    }

    /**
     *
     */
    async function load(): Promise<void> {
      try {
        const [earningsRes, profileRes] = await Promise.all([
          fetch(`/api/expertise/earnings?profileId=${pid}`),
          fetch(`/api/expertise/profiles?profileId=${pid}`),
        ]);

        if (earningsRes.ok) {
          const newData = unwrap(await earningsRes.json()) as EarningsData;
          setData((prev) => {
            if (prev && newData.transactions.length > prev.transactions.length) {
              play("success");
            }
            return newData;
          });
          setBalance(parseFloat(newData.totalEarnings || "0").toFixed(2));
        }

        if (profileRes.ok) {
          setProfile(unwrap(await profileRes.json()) as ProfileData);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(interval);
  }, [play]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center">
      <AsciiLandscape
        audioLevel={0}
        isActive={false}
        isComplete={data?.status === "live"}
        identity={userIdentity || undefined}
      />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setBalanceOpen(true)}
          className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                     hover:bg-white/10 active:scale-[0.97] transition-all cursor-pointer"
        >
          <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
            Balance
          </span>
          <span className="text-sm font-heading text-white font-semibold">
            {balance} <span className="text-white/50">USDC</span>
          </span>
        </button>
      </header>

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
                <Link href="/" className={buttonVariants({ variant: "link" })}>
                  Get started
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : data.status !== "live" ? (
          <InterviewIncomplete play={play} router={router} />
        ) : (
          <AgentLive
            data={data}
            profile={profile}
            profileId={profileId}
            play={play}
            celebrateEntrance={celebrateEntrance}
            router={router}
          />
        )}
      </div>

      <BalanceSheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        profileId={profileId}
      />

      <footer className="absolute bottom-0 inset-x-0 z-10 py-5 px-6 text-center">
        <p className="font-mono text-xs text-white/30">
          Verified Minds v0.1.0 &middot; Built by{" "}
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
