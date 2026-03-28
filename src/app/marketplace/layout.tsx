"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { pageTransition, pageTransitionConfig } from "@/lib/motion";
import ThemeToggle from "@/components/ThemeToggle";
import SoundToggle from "@/components/SoundToggle";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col ascii-texture">
      <header className="fixed top-0 right-0 z-50 flex items-center gap-1 p-3">
        <SoundToggle />
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12">
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
    </div>
  );
}
