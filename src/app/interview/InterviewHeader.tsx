"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Mic } from "lucide-react";
import type { ReactElement } from "react";

/**
 * Props for the InterviewHeader component
 */
interface InterviewHeaderProps {
  /** USDC balance string (e.g. "12.50") */
  balance: string;
  /** Whether the device mic is hardware-muted */
  deviceMuted: boolean;
  /** Whether to show the mic permission alert */
  showMicAlert: boolean;
  /** Current mic permission state label ("Mic blocked" or "Mic required") */
  micPermission: "granted" | "denied" | "prompt" | "unknown";
  /** Called when the balance pill is tapped */
  onBalanceClick: () => void;
}

/**
 * Fixed header bar for the interview page.
 * Shows branding, balance pill, and mic/muted status badges.
 * @param root0
 * @param root0.balance
 * @param root0.deviceMuted
 * @param root0.showMicAlert
 * @param root0.micPermission
 * @param root0.onBalanceClick
 */
export default function InterviewHeader({
  balance,
  deviceMuted,
  showMicAlert,
  micPermission,
  onBalanceClick,
}: InterviewHeaderProps): ReactElement {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2">
        <span className="text-sm font-heading text-white font-normal tracking-tight">
          Verified Minds
        </span>
        <span className="text-sm font-heading text-white/30 font-semibold tracking-tight">
          v0.1.0
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBalanceClick}
          className="flex items-center gap-2 backdrop-blur-md bg-black/30 rounded-full px-4 py-2
                     hover:bg-white/10 active:scale-97 transition-all cursor-pointer"
        >
          <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
            Balance
          </span>
          <span className="text-sm font-heading text-white font-semibold">
            {balance} <span className="text-white/50">USDC</span>
          </span>
        </button>
        <AnimatePresence>
          {deviceMuted && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-1.5 backdrop-blur-md bg-amber-500/20 border border-amber-500/30
                         rounded-full px-3 py-1.5 text-xs text-amber-300"
            >
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Device muted</span>
            </motion.div>
          )}
          {showMicAlert && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-1.5 backdrop-blur-md bg-red-500/20 border border-red-500/30
                         rounded-full px-3 py-1.5 text-xs text-red-300"
            >
              <Mic className="size-3.5 shrink-0" />
              <span>
                {micPermission === "denied" ? "Mic blocked" : "Mic required"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
