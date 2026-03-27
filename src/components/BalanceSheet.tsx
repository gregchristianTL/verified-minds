"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { X, ArrowUpRight } from "lucide-react";
import { gentle } from "@/lib/motion";

interface Transaction {
  id: string;
  querySummary: string | null;
  domainTag: string | null;
  amount: number;
  txHash: string | null;
  createdAt: string;
}

interface BalanceSheetProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
}

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  animate?: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Builds cumulative PNL points from transactions (oldest → newest) */
function buildCumulativePoints(transactions: Transaction[]): number[] {
  if (transactions.length === 0) return [0, 0];
  // API returns newest-first, reverse for chronological order
  const sorted = [...transactions].reverse();
  let cumulative = 0;
  const points = [0];
  for (const tx of sorted) {
    cumulative += tx.amount;
    points.push(cumulative);
  }
  return points;
}

function Sparkline({
  points,
  width = 200,
  height = 48,
  color = "rgb(52, 211, 153)",
  fillColor = "rgba(52, 211, 153, 0.08)",
  animate = true,
}: SparklineProps): React.ReactElement {
  if (points.length < 2) {
    // Flat line when no data
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <line
          x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const padding = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => ({
    x: padding + (i / (points.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - min) / range) * (height - padding * 2),
  }));

  // Smooth path using cardinal spline
  const linePath = coords
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(" ");

  const fillPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  const pathLength = coords.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Fill area */}
      {animate ? (
        <motion.path
          d={fillPath}
          fill={fillColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
      ) : (
        <path d={fillPath} fill={fillColor} />
      )}

      {/* Line */}
      {animate ? (
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ pathLength: undefined }}
          strokeDasharray={pathLength}
          strokeDashoffset={0}
        />
      ) : (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* End dot */}
      {animate ? (
        <motion.circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={2.5}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        />
      ) : (
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}

export default function BalanceSheet({
  open,
  onClose,
  profileId,
}: BalanceSheetProps): React.ReactElement {
  const [totalEarnings, setTotalEarnings] = useState("0.00");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`/api/expertise/earnings?profileId=${profileId}`);
      if (!res.ok) return;
      const data = await res.json();
      setTotalEarnings(parseFloat(data.totalEarnings || "0").toFixed(2));
      setTransactions(data.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchData();
    }
  }, [open, fetchData]);

  const available = totalEarnings;

  const cumulativePoints = useMemo(
    () => buildCumulativePoints(transactions),
    [transactions],
  );

  // Last 7 days of transactions for the "available" sparkline
  const recentPoints = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = transactions.filter(
      (tx) => new Date(tx.createdAt).getTime() >= cutoff,
    );
    return buildCumulativePoints(recent);
  }, [transactions]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={gentle}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top,0px),24px)] pb-4">
              <h2 className="text-lg font-heading text-white font-semibold tracking-tight">
                Wallet
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="size-5 text-white/40" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Available balance — hero */}
                  <div className="pt-6 pb-2">
                    <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-2">
                      Available balance
                    </p>
                    <p className="text-5xl font-heading text-white font-semibold tabular-nums tracking-tight">
                      {available}
                    </p>
                    <p className="text-sm text-white/30 font-mono mt-1">USDC</p>
                  </div>

                  {/* Available PNL chart — 7-day view */}
                  <div className="py-4">
                    <Sparkline
                      points={recentPoints}
                      width={340}
                      height={56}
                      color="rgb(52, 211, 153)"
                      fillColor="rgba(52, 211, 153, 0.06)"
                      animate
                    />
                    <p className="text-[10px] font-mono text-white/15 mt-2">Last 7 days</p>
                  </div>

                  {/* All-time stat */}
                  <div className="pt-6 pb-2 border-t border-white/[0.06]">
                    <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-2">
                      All-time earned
                    </p>
                    <p className="text-3xl font-heading text-white/50 font-semibold tabular-nums tracking-tight">
                      {totalEarnings}
                    </p>
                    <p className="text-xs text-white/20 font-mono mt-1">USDC</p>
                  </div>

                  {/* All-time PNL chart */}
                  <div className="py-4">
                    <Sparkline
                      points={cumulativePoints}
                      width={340}
                      height={48}
                      color="rgba(255, 255, 255, 0.3)"
                      fillColor="rgba(255, 255, 255, 0.02)"
                      animate
                    />
                    <p className="text-[10px] font-mono text-white/15 mt-2">All time</p>
                  </div>

                  {/* Transaction history */}
                  <div className="pt-6 border-t border-white/[0.06]">
                    <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest mb-4">
                      Transactions
                    </p>

                    {transactions.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm text-white/25">No transactions yet</p>
                        <p className="text-xs text-white/15 mt-1">
                          Earnings appear here as your agent gets queried.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {transactions.map((tx, i) => (
                          <div
                            key={tx.id}
                            className={`flex items-center justify-between py-3.5 ${
                              i > 0 ? "border-t border-white/5" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="text-sm text-white/70 truncate">
                                {tx.querySummary ?? "Query"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {tx.domainTag && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1.5 bg-transparent text-white/25 border-0 p-0"
                                  >
                                    {tx.domainTag}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-white/20 font-mono">
                                  {timeAgo(tx.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                                +{tx.amount.toFixed(2)}
                              </span>
                              {tx.txHash && (
                                <a
                                  href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 -mr-1 hover:text-white/50 transition-colors"
                                >
                                  <ArrowUpRight className="size-3.5 text-white/20" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
