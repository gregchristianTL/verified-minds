"use client";

import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Single earnings transaction
 */
export interface Transaction {
  id: string;
  querySummary: string | null;
  domainTag: string | null;
  amount: number;
  txHash: string | null;
  createdAt: string;
}

/**
 * @param dateStr - ISO date string
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
 * Props for the TransactionList component
 */
interface TransactionListProps {
  transactions: Transaction[];
}

/**
 * TransactionList - Renders the earnings transaction history.
 * Shows query summaries, domain tags, amounts, and on-chain links.
 * @param root0
 * @param root0.transactions
 */
export default function TransactionList({
  transactions,
}: TransactionListProps): React.ReactElement {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-white/25">No transactions yet</p>
        <p className="text-xs text-white/15 mt-1">
          Earnings appear here as your agent gets queried.
        </p>
      </div>
    );
  }

  return (
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
  );
}
