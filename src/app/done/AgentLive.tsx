"use client";

import { motion } from "framer-motion";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import Link from "next/link";

import EarningsFeed from "@/components/EarningsFeed";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeIn, fadeInUp, gentle, scaleIn, staggerContainer } from "@/lib/motion";
import type { SoundName } from "@/lib/sounds";

/** Earnings data shape from the API */
export interface EarningsData {
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

/** Profile data shape from the API */
export interface ProfileData {
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

/**
 *
 * @param name
 */
function nameColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 *
 * @param displayName
 */
function displayInitials(displayName: string): string {
  return (
    displayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 *
 * @param score
 */
function confidenceDotClass(score: number): string {
  if (score >= 70) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

/**
 * Props for the AgentLive component
 */
interface AgentLiveProps {
  data: EarningsData;
  profile: ProfileData | null;
  profileId: string;
  play: (name: SoundName) => void;
  celebrateEntrance: boolean;
  router: AppRouterInstance;
}

/**
 * AgentLive - Post-interview dashboard shown when the user's agent is live.
 * Displays identity, knowledge stats, earnings feed, and marketplace link.
 * @param root0
 * @param root0.data
 * @param root0.profile
 * @param root0.profileId
 * @param root0.play
 * @param root0.celebrateEntrance
 * @param root0.router
 */
// eslint-disable-next-line max-lines-per-function -- dashboard layout with multiple sections
export default function AgentLive({
  data,
  profile,
  profileId,
  play,
  celebrateEntrance,
  router,
}: AgentLiveProps): React.ReactElement {
  const displayName = profile?.displayName ?? data.displayName;
  const bio = profile?.bio ?? null;
  const domains = profile?.domains?.length ? profile.domains : data.domains;
  const knowledgeCount = profile?.knowledgeItemCount ?? 0;
  const confidenceEntries = Object.entries(profile?.confidenceMap ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
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
        <AvatarFallback className={avatarClass}>
          {displayInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <h2 className="font-heading text-2xl font-medium tracking-tight text-white">
        {displayName}
      </h2>
      {bio && (
        <p className="text-white/60 text-sm leading-relaxed max-w-sm">{bio}</p>
      )}
      {domains.length > 0 && (
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
      )}
    </div>
  );

  const knowledgeBlock = (
    <div className="w-full space-y-2 text-center">
      <p className="text-xs text-white/50 font-mono">
        {knowledgeCount} knowledge items extracted
      </p>
      {confidenceEntries.length > 0 && (
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
      )}
    </div>
  );

  const statusCopy = (
    <p className="text-sm text-white/50 text-center leading-relaxed max-w-sm">
      Your agent is online in the Verified Minds marketplace. When another AI or
      person queries your agent, you earn USDC automatically.
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
      <EarningsFeed
        totalEarnings={data.totalEarnings}
        transactions={data.transactions}
      />
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
        <motion.div variants={scaleIn} transition={gentle}>{liveBadge}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">{identityBlock}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">{knowledgeBlock}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">{statusCopy}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">{cta}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle} className="w-full">{earningsBlock}</motion.div>
        <motion.div variants={fadeInUp} transition={gentle}>{browseLink}</motion.div>
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
