"use client";

import Link from "next/link";

interface ExpertCardProps {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
}

/** Consistent hash to pastel color for avatar backgrounds */
function nameColor(name: string): string {
  const colors = [
    "bg-indigo-100 text-indigo-600",
    "bg-amber-100 text-amber-600",
    "bg-emerald-100 text-emerald-600",
    "bg-rose-100 text-rose-600",
    "bg-sky-100 text-sky-600",
    "bg-violet-100 text-violet-600",
    "bg-orange-100 text-orange-600",
    "bg-teal-100 text-teal-600",
  ];
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Marketplace card for browsing expert agents */
export default function ExpertCard({
  id,
  displayName,
  bio,
  domains,
  queryPrice,
}: ExpertCardProps): React.ReactElement {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/expertise/marketplace/${id}`}
      className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] shadow-[var(--shadow)]
                 hover:shadow-[var(--shadow-md)] transition-shadow"
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${nameColor(displayName)}`}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--foreground)]">{displayName}</p>
        {bio && (
          <p className="text-[var(--muted)] text-sm line-clamp-1 mt-0.5">
            {bio}
          </p>
        )}
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {domains.map((d) => (
            <span
              key={d}
              className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-[10px] font-medium"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <span className="text-[var(--muted)] text-sm whitespace-nowrap font-medium">
        ${parseFloat(queryPrice).toFixed(2)}
      </span>
    </Link>
  );
}
