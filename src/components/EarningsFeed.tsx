"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { fadeInUp, gentle,staggerContainer } from "@/lib/motion";

/**
 *
 */
interface Transaction {
  id: string;
  querySummary: string | null;
  domainTag: string | null;
  amount: number;
  txHash: string | null;
  createdAt: string;
}

/**
 *
 */
interface EarningsFeedProps {
  totalEarnings: string;
  transactions: Transaction[];
}

/**
 *
 * @param dateStr
 */
function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Animated counter that counts up to the target value
 * @param root0
 * @param root0.value
 */
function AnimatedCounter({ value }: { value: number }): React.ReactElement {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) {
      setDisplay(value);
      return;
    }

    const duration = 800;
    const startTime = Date.now();

    /**
     *
     */
    function tick(): void {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    }

    requestAnimationFrame(tick);
  }, [value]);

  return <>{display.toFixed(2)} <span className="text-muted-foreground text-3xl">USDC</span></>;
}

/**
 *
 * @param root0
 * @param root0.totalEarnings
 * @param root0.transactions
 */
export default function EarningsFeed({
  totalEarnings,
  transactions,
}: EarningsFeedProps): React.ReactElement {
  const total = parseFloat(totalEarnings || "0");
  const { play } = useSoundSystem();
  const prevTxCountRef = useRef(transactions.length);

  // Play cha-ching when new transactions arrive (skip initial render)
  useEffect(() => {
    if (transactions.length > prevTxCountRef.current) {
      play("chaChing");
    }
    prevTxCountRef.current = transactions.length;
  }, [transactions.length, play]);

  return (
    <motion.div
      className="w-full max-w-sm space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Hero earnings card */}
      <motion.div variants={fadeInUp} transition={gentle}>
        <Card className="shadow-lg border-0">
          <CardContent className="text-center py-8 px-8">
            <p className="text-5xl font-bold tracking-tight text-foreground">
              <AnimatedCounter value={total} />
            </p>
            <p className="text-muted-foreground text-sm mt-2">total earned</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div variants={fadeInUp} transition={gentle}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Recent activity
        </p>
        <Card>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-muted-foreground text-sm">
                  No queries yet — sit back and relax.
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  You&apos;ll see earnings here as they come in.
                </p>
              </div>
            ) : (
              <div>
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, ...gentle }}
                  >
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm text-foreground truncate">
                          {tx.querySummary ?? "Query"}
                        </p>
                        {tx.domainTag && (
                          <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                            {tx.domainTag}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-vm-success text-sm font-semibold">
                          +{tx.amount.toFixed(2)} USDC
                        </span>
                        <span className="text-muted-foreground/60 text-xs">
                          {timeAgo(tx.createdAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
