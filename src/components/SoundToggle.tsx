"use client";

import { AnimatePresence,motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useSoundStore } from "@/providers/SoundProvider";

/**
 *
 */
export default function SoundToggle(): React.ReactElement {
  const { isMuted, toggleMute } = useSoundStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={toggleMute}
      aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={isMuted ? "muted" : "unmuted"}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isMuted ? (
            <>
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </>
          ) : (
            <>
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          )}
        </motion.svg>
      </AnimatePresence>
    </Button>
  );
}
