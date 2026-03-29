"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSoundSystem } from "@/hooks/useSoundSystem";

/**
 *
 */
interface ExpertCardProps {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
}

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

/**
 *
 * @param name
 */
function nameColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.displayName
 * @param root0.bio
 * @param root0.domains
 * @param root0.queryPrice
 */
export default function ExpertCard({
  id,
  displayName,
  bio,
  domains,
  queryPrice,
}: ExpertCardProps): React.ReactElement {
  const { play } = useSoundSystem();

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/marketplace/${id}`} onClick={() => play("click")}>
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => play("hover")}
        className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4
                   hover:bg-black/70 hover:border-white/20 transition-all cursor-pointer
                   flex items-center gap-4"
      >
        <Avatar className={`w-11 h-11 ${nameColor(displayName)}`}>
          <AvatarFallback className={nameColor(displayName)}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{displayName}</p>
          {bio && (
            <p className="text-white/50 text-sm line-clamp-1 mt-0.5">{bio}</p>
          )}
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {domains.map((d) => (
              <span
                key={d}
                className="text-[10px] h-5 inline-flex items-center px-2 rounded-full
                           bg-white/[0.12] text-white/80 font-mono"
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        <span className="font-mono text-white/40 text-sm whitespace-nowrap font-medium">
          ${parseFloat(queryPrice).toFixed(2)}
        </span>
      </motion.div>
    </Link>
  );
}
