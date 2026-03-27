"use client";

interface Transaction {
  id: string;
  querySummary: string | null;
  domainTag: string | null;
  amount: number;
  txHash: string | null;
  createdAt: string;
}

interface EarningsFeedProps {
  totalEarnings: string;
  transactions: Transaction[];
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

export default function EarningsFeed({
  totalEarnings,
  transactions,
}: EarningsFeedProps): React.ReactElement {
  const total = parseFloat(totalEarnings || "0");

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Hero earnings card */}
      <div className="text-center p-8 rounded-3xl bg-[var(--card)] shadow-[var(--shadow-md)]">
        <p className="text-5xl font-bold tracking-tight text-[var(--foreground)]">
          ${total.toFixed(2)}
        </p>
        <p className="text-[var(--muted)] text-sm mt-2">total earned</p>
      </div>

      {/* Transactions */}
      <div>
        <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3 px-1">
          Recent activity
        </p>
        <div className="rounded-2xl bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden divide-y divide-[var(--border)]">
          {transactions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[var(--muted)] text-sm">
                No queries yet — sit back and relax.
              </p>
              <p className="text-[var(--muted-light)] text-xs mt-1">
                You&apos;ll see earnings here as they come in.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-4 py-3.5"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-[var(--foreground)] truncate">
                    {tx.querySummary ?? "Query"}
                  </p>
                  {tx.domainTag && (
                    <p className="text-xs text-[var(--muted-light)] mt-0.5">
                      {tx.domainTag}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[var(--success)] text-sm font-semibold">
                    +${tx.amount.toFixed(2)}
                  </span>
                  <span className="text-[var(--muted-light)] text-xs">
                    {timeAgo(tx.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
