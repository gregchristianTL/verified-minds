"use client";

import { create } from "zustand";

/**
 *
 */
interface SoundState {
  isMuted: boolean;
  toggleMute: () => void;
}

/**
 * Global sound mute state backed by zustand + localStorage.
 * Using zustand instead of React context so sound state can be
 * read synchronously inside callbacks without re-render overhead.
 */
export const useSoundStore = create<SoundState>((set) => ({
  isMuted: typeof window !== "undefined"
    ? localStorage.getItem("vm-sound-muted") === "true"
    : false,
  /**
   *
   */
  toggleMute: () =>
    set((state) => {
      const next = !state.isMuted;
      if (typeof window !== "undefined") {
        localStorage.setItem("vm-sound-muted", String(next));
      }
      return { isMuted: next };
    }),
}));

/**
 * Thin wrapper that just renders children — the actual state lives
 * in the zustand store above. This component exists so the root
 * layout reads clearly (ThemeProvider + SoundProvider).
 * @param root0
 * @param root0.children
 */
export function SoundProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
