"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import ExpertQuery from "@/components/ExpertQuery";

export default function QueryExpertPage(): React.ReactElement {
  const params = useParams();
  const profileId = params.agentId as string;

  return (
    <div className="w-full max-w-lg flex flex-col h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[var(--border)]">
        <Link
          href="/expertise/marketplace"
          className="w-8 h-8 rounded-full bg-[var(--card)] shadow-[var(--shadow)] flex items-center justify-center
                     text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="font-medium text-[var(--foreground)]">Ask an Expert</h1>
          <p className="text-xs text-[var(--muted)]">Powered by verified human knowledge</p>
        </div>
      </div>

      <ExpertQuery profileId={profileId} />
    </div>
  );
}
