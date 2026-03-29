"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import AsciiLandscape from "@/components/AsciiLandscape";
import { pageTransition, pageTransitionConfig, fadeInUp, gentle } from "@/lib/motion";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      {/* Immersive background — static idle, same as done page */}
      <AsciiLandscape audioLevel={0} isActive={false} isComplete={false} />

      {/* Branding header */}
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
            v0.1.0
          </span>
        </Link>
      </header>

      {/* Page content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransitionConfig}
            className="w-full flex flex-col items-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer — matches home + done */}
      <motion.footer
        className="relative z-10 py-5 px-6 text-center"
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
          </a>{" "}
          for{" "}
          <a
            href="https://world.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-colors"
          >
            World
          </a>{" "}
          x{" "}
          <a
            href="https://coinbase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-[#0052FF] transition-colors"
          >
            Coinbase
          </a>
        </p>
      </motion.footer>
    </div>
  );
}
