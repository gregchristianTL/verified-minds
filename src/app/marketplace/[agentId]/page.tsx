"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fadeInUp, staggerContainer, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { ChevronLeft, Copy, Check, Terminal, FileText, Loader2 } from "lucide-react";
import type { MarketplaceListing } from "@/types";

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

function buildDirective(expert: MarketplaceListing, origin: string): string {
  return [
    `Use this verified expert agent via x402 payment:`,
    ``,
    `  Endpoint: ${origin}/api/expertise/query`,
    `  Method:   POST`,
    `  Body:     { "profileId": "${expert.id}", "question": "<your question>" }`,
    `  Payment:  $${parseFloat(expert.queryPrice).toFixed(2)} USDC on Base Sepolia (x402 protocol)`,
    ``,
    `This agent specializes in: ${expert.domains.join(", ")}`,
    `Agent: ${expert.displayName}${expert.bio ? ` — ${expert.bio}` : ""}`,
  ].join("\n");
}

function buildCurl(expert: MarketplaceListing, origin: string): string {
  return [
    `curl -X POST ${origin}/api/expertise/query \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-Payment: <x402-payment-token>" \\`,
    `  -d '{`,
    `    "profileId": "${expert.id}",`,
    `    "question": "Your question here"`,
    `  }'`,
  ].join("\n");
}

/** Copy-to-clipboard block with label and icon */
function CopyBlock({
  label,
  icon: Icon,
  content,
  onCopy,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  onCopy: () => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  }, [content, onCopy]);

  return (
    <motion.div
      variants={fadeInUp}
      transition={gentle}
      className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider">
          <Icon className="size-3.5" />
          {label}
        </div>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                     bg-white/5 text-white/60 hover:text-white hover:bg-white/10
                     transition-all active:scale-[0.97] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="size-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 text-[13px] leading-relaxed font-mono text-white/80 overflow-x-auto whitespace-pre">
        {content}
      </pre>
    </motion.div>
  );
}

export default function AgentDetailPage(): React.ReactElement {
  const params = useParams();
  const agentId = params.agentId as string;
  const { play } = useSoundSystem();
  const [expert, setExpert] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expertise/marketplace/${agentId}`)
      .then((r) => r.json())
      .then((data) => setExpert(data.expert ?? null))
      .finally(() => setLoading(false));
  }, [agentId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!expert) {
    return (
      <motion.div
        className="w-full max-w-lg text-center space-y-4"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={gentle}
      >
        <p className="text-white font-medium">Agent not found</p>
        <Link
          href="/marketplace"
          className="text-primary text-sm hover:underline"
          onClick={() => play("navigate")}
        >
          Back to marketplace
        </Link>
      </motion.div>
    );
  }

  const initials = expert.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      className="w-full max-w-lg space-y-5"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        variants={fadeInUp}
        transition={gentle}
      >
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center size-9 rounded-full
                     backdrop-blur-md bg-white/5 text-white/60 hover:text-white hover:bg-white/10
                     transition-all active:scale-[0.97]"
          onClick={() => play("navigate")}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="text-white/40 text-sm">Marketplace</span>
      </motion.div>

      {/* Agent identity card */}
      <motion.div
        variants={fadeInUp}
        transition={gentle}
        className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-5"
      >
        <div className="flex items-center gap-4">
          <Avatar className={`w-14 h-14 ${nameColor(expert.displayName)}`}>
            <AvatarFallback className={`text-lg ${nameColor(expert.displayName)}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl font-bold text-white">{expert.displayName}</h1>
            {expert.bio && (
              <p className="text-white/50 text-sm mt-0.5">{expert.bio}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {expert.domains.map((d) => (
            <span
              key={d}
              className="text-[11px] h-6 inline-flex items-center px-2.5 rounded-full
                         bg-white/[0.12] text-white/80 font-mono"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Price per query</p>
            <p className="font-mono text-white font-semibold mt-0.5">
              ${parseFloat(expert.queryPrice).toFixed(2)} <span className="text-white/40">USDC</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Network</p>
            <p className="font-mono text-white/70 text-sm mt-0.5">Base Sepolia</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Protocol</p>
            <p className="font-mono text-white/70 text-sm mt-0.5">x402</p>
          </div>
        </div>
      </motion.div>

      {/* Directive — paste into IDE / AI chat */}
      <CopyBlock
        label="Directive"
        icon={FileText}
        content={buildDirective(expert, origin)}
        onCopy={() => play("click")}
      />

      {/* curl snippet — programmatic usage */}
      <CopyBlock
        label="curl"
        icon={Terminal}
        content={buildCurl(expert, origin)}
        onCopy={() => play("click")}
      />

      {/* Footer hint */}
      <motion.p
        variants={fadeInUp}
        transition={gentle}
        className="text-center text-white/30 text-xs"
      >
        Agents discover this endpoint via{" "}
        <Link href="/api/agents" className="text-primary/60 hover:text-primary transition-colors">
          /api/agents
        </Link>
      </motion.p>
    </motion.div>
  );
}
