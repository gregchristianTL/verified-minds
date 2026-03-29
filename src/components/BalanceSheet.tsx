"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import Sparkline from "@/components/Sparkline";
import TransactionList, { type Transaction } from "@/components/TransactionList";
import { unwrap } from "@/lib/api/unwrap";
import { gentle } from "@/lib/motion";

/**
 *
 */
interface BalanceSheetProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
}

/**
 * Builds cumulative PNL points from transactions (oldest → newest)
 * @param transactions
 */
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

/**
 * @param root0 - BalanceSheet props
 * @param root0.open - whether the sheet is visible
 * @param root0.onClose - callback to close the sheet
 * @param root0.profileId - the user's profile ID for fetching earnings
 */
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
      const data = unwrap(await res.json());
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

                    <TransactionList transactions={transactions} />
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
