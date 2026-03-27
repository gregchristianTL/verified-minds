"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EarningsFeed from "@/components/EarningsFeed";

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
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileId = sessionStorage.getItem("profileId");
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
          setData(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center space-y-4 p-8 rounded-2xl bg-[var(--card)] shadow-[var(--shadow)]">
        <p className="text-[var(--muted)]">No profile found.</p>
        <Link href="/expertise" className="text-[var(--accent)] text-sm font-medium">
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Live badge */}
      {data.status === "live" && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--success-bg)]">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-gentle-pulse" />
          <span className="text-[var(--success)] text-xs font-medium">
            Your agent is live
          </span>
        </div>
      )}

      <EarningsFeed
        totalEarnings={data.totalEarnings}
        transactions={data.transactions}
      />

      {/* Domain tags */}
      {data.domains.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {data.domains.map((d) => (
            <span
              key={d}
              className="px-3 py-1 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-medium"
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
