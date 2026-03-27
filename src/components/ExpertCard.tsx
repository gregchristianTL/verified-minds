"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSoundSystem } from "@/hooks/useSoundSystem";

interface ExpertCardProps {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
}

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
  "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
];

function nameColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
    <Link href={`/expertise/marketplace/${id}`} onClick={() => play("click")}>
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onHoverStart={() => play("hover")}
      >
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className={`w-11 h-11 ${nameColor(displayName)}`}>
              <AvatarFallback className={nameColor(displayName)}>
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{displayName}</p>
              {bio && (
                <p className="text-muted-foreground text-sm line-clamp-1 mt-0.5">
                  {bio}
                </p>
              )}
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {domains.map((d) => (
                  <Badge key={d} variant="secondary" className="text-[10px] h-5">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>

            <span className="font-mono text-muted-foreground text-sm whitespace-nowrap font-medium">
              ${parseFloat(queryPrice).toFixed(2)}
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
