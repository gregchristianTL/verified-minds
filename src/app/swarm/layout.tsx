/**
 * Swarm layout -- wraps the swarm page with AsciiLandscape background
 * and consistent branding, matching the marketplace layout style.
 */

"use client";

import Link from "next/link";

import AsciiLandscape from "@/components/AsciiLandscape";
import { fadeInUp, gentle } from "@/lib/motion";
import { motion } from "framer-motion";

/**
 * @param root0 - Layout props
 * @param root0.children - Page content
 */
export default function SwarmLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      <AsciiLandscape audioLevel={0} isActive={false} isComplete={false} />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                     hover:bg-white/10 active:scale-[0.97] transition-all"
        >
          <span className="text-sm font-heading text-white font-normal tracking-tight">
            Verified Minds
          </span>
          <span className="text-sm font-heading text-white/30 font-semibold tracking-tight">
            Swarm
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className="text-xs text-white/40 hover:text-white/70 transition-colors backdrop-blur-md bg-black/30 rounded-full px-3 py-1.5"
          >
            Marketplace
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>

      <motion.footer
        className="relative z-10 py-4 px-6 text-center shrink-0"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ ...gentle, delay: 0.4 }}
      >
        <p className="font-mono text-xs text-white/30">
          Verified Minds{" "}
          <Link href="/legal" className="text-white/40 hover:text-white/60 transition-colors">
            v0.1.0
          </Link>
          {" "}&middot; Built by{" "}
          <a
            href="https://tributelabs.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-[#FF00FF] transition-colors"
          >
            Tribute Labs
          </a>
        </p>
      </motion.footer>
    </div>
  );
}
