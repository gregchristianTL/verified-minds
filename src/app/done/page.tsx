"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AsciiLandscape from "@/components/AsciiLandscape";
import EarningsFeed from "@/components/EarningsFeed";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, fadeInUp, scaleIn, gentle, fadeIn } from "@/lib/motion";
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

interface ProfileData {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  confidenceMap: Record<string, number>;
  knowledgeItemCount: number;
  adinAgentId: string | null;
  status: string;
  queryPrice: string;
}

const AVATAR_COLORS = [
  "bg-amber-900/40 text-amber-400",
  "bg-orange-900/40 text-orange-400",
  "bg-emerald-900/40 text-emerald-400",
  "bg-rose-900/40 text-rose-400",
  "bg-sky-900/40 text-sky-400",
  "bg-violet-900/40 text-violet-400",
  "bg-red-900/40 text-red-400",
  "bg-teal-900/40 text-teal-400",
];

function nameColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function displayInitials(displayName: string): string {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

function confidenceDotClass(score: number): string {
  if (score >= 70) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

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
        const [earningsRes, profileRes] = await Promise.all([
          fetch(`/api/expertise/earnings?profileId=${profileId}`),
          fetch(`/api/expertise/profiles?profileId=${profileId}`),
        ]);

        if (earningsRes.ok) {
          const newData: EarningsData = await earningsRes.json();
          setData((prev) => {
            if (prev && newData.transactions.length > prev.transactions.length) {
              play("success");
            }
            return newData;
          });
          setBalance(parseFloat(newData.totalEarnings || "0").toFixed(2));
        }

        if (profileRes.ok) {
          const p: ProfileData = await profileRes.json();
          setProfile(p);
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
          <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Balance</span>
          <span className="text-sm font-heading text-white font-semibold">{balance} <span className="text-white/50">USDC</span></span>
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

function AgentLive({
  data,
  profile,
  profileId,
  play,
  celebrateEntrance,
  router,
}: {
  data: EarningsData;
  profile: ProfileData | null;
  profileId: string;
  play: (name: SoundName) => void;
  celebrateEntrance: boolean;
  router: ReturnType<typeof useRouter>;
}): React.ReactElement {
  const displayName = profile?.displayName ?? data.displayName;
  const bio = profile?.bio ?? null;
  const domains = profile?.domains?.length ? profile.domains : data.domains;
  const knowledgeCount = profile?.knowledgeItemCount ?? 0;
  const confidenceEntries = Object.entries(profile?.confidenceMap ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const marketplaceId = profile?.id ?? profileId;
  const avatarClass = nameColor(displayName);

  const cardClass =
    "w-full max-w-md flex flex-col items-center gap-6 backdrop-blur-lg bg-black/20 rounded-3xl px-8 py-10";

  const liveBadge = (
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
  );

  const identityBlock = (
    <div className="w-full flex flex-col items-center text-center gap-3">
      <Avatar className={`w-16 h-16 text-lg font-heading ${avatarClass}`}>
        <AvatarFallback className={avatarClass}>{displayInitials(displayName)}</AvatarFallback>
      </Avatar>
      <h2 className="font-heading text-2xl font-medium tracking-tight text-white">{displayName}</h2>
      {bio ? (
        <p className="text-white/60 text-sm leading-relaxed max-w-sm">{bio}</p>
      ) : null}
      {domains.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {domains.map((d) => (
            <span
              key={d}
              className="text-[11px] h-6 inline-flex items-center px-2.5 rounded-full bg-white/[0.12] text-white/80 font-mono"
            >
              {d}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const knowledgeBlock = (
    <div className="w-full space-y-2 text-center">
      <p className="text-xs text-white/50 font-mono">
        {knowledgeCount} knowledge items extracted
      </p>
      {confidenceEntries.length > 0 ? (
        <ul className="flex flex-col gap-1 items-center text-[11px] text-white/45 font-mono">
          {confidenceEntries.map(([domain, score]) => (
            <li key={domain} className="inline-flex items-center gap-2">
              <span
                className={`size-1.5 shrink-0 rounded-full ${confidenceDotClass(score)}`}
                aria-hidden
              />
              <span>
                {domain}{" "}
                <span className="text-white/35">({Math.round(score)})</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  const statusCopy = (
    <p className="text-sm text-white/50 text-center leading-relaxed max-w-sm">
      Your agent is online in the Verified Minds marketplace. When another AI or person queries your
      agent, you earn USDC automatically.
    </p>
  );

  const cta = (
    <Button
      size="lg"
      className="w-full py-6 rounded-2xl text-base font-heading font-medium shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
      onClick={() => {
        play("click");
        router.push(`/marketplace/${marketplaceId}`);
      }}
    >
      View in Marketplace
    </Button>
  );

  const earningsBlock = (
    <div className="w-full flex justify-center">
      <EarningsFeed totalEarnings={data.totalEarnings} transactions={data.transactions} />
    </div>
  );

  const browseLink = (
    <Link
      href="/marketplace"
      className="text-white/40 text-sm hover:text-primary transition-colors font-mono"
      onClick={() => play("navigate")}
    >
      Browse marketplace
    </Link>
  );

  if (celebrateEntrance) {
    return (
      <motion.div
        className={cardClass}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={scaleIn} transition={gentle}>
          {liveBadge}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">
          {identityBlock}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">
          {knowledgeBlock}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">
          {statusCopy}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">
          {cta}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">
          {earningsBlock}
        </motion.div>
        <motion.div variants={fadeInUp} transition={gentle}>
          {browseLink}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cardClass}
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={gentle}
    >
      <div>{liveBadge}</div>
      <div className="w-full">{identityBlock}</div>
      <div className="w-full">{knowledgeBlock}</div>
      <div className="w-full">{statusCopy}</div>
      <div className="w-full">{cta}</div>
      <div className="w-full">{earningsBlock}</div>
      <div>{browseLink}</div>
    </motion.div>
  );
}
