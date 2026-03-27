"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExpertCard from "@/components/ExpertCard";

interface ExpertListing {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
  adinAgentId: string | null;
}

export default function MarketplacePage(): React.ReactElement {
  const [experts, setExperts] = useState<ExpertListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expertise/marketplace")
      .then((r) => r.json())
      .then((data) => setExperts(data.experts ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Ask a Real Expert
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Real humans, verified by World ID. Their knowledge, your questions.
        </p>
      </div>

      {experts.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl bg-[var(--card)] shadow-[var(--shadow)]">
          <p className="text-[var(--foreground)] font-medium">No experts yet</p>
          <p className="text-[var(--muted)] text-sm mt-1">
            Be the first to share your expertise.
          </p>
          <Link
            href="/expertise"
            className="inline-block mt-4 px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            Become an expert
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {experts.map((expert) => (
            <ExpertCard
              key={expert.id}
              id={expert.id}
              displayName={expert.displayName}
              bio={expert.bio}
              domains={expert.domains}
              queryPrice={expert.queryPrice}
            />
          ))}
        </div>
      )}

      <div className="text-center pt-2">
        <Link
          href="/expertise"
          className="text-[var(--muted)] text-sm hover:text-[var(--accent)] transition-colors"
        >
          Want to become an expert?
        </Link>
      </div>
    </div>
  );
}
