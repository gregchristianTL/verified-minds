"use client";

import { useCallback, useRef, useEffect } from "react";
import { Howl } from "howler";
import { SOUND_MAP, SOUND_VOLUMES, type SoundName } from "@/lib/sounds";
import { useSoundStore } from "@/providers/SoundProvider";

/**
 * Central hook for playing UI sounds.
 * Preloads all sound files on first mount and caches Howl instances.
 * Respects the global mute state from SoundProvider.
 */
export function useSoundSystem(): {
  play: (name: SoundName) => void;
  playAmbient: (src: string, options?: { loop?: boolean; volume?: number }) => Howl | null;
} {
  const howlCache = useRef<Map<string, Howl>>(new Map());
  const isMuted = useSoundStore((s) => s.isMuted);

  useEffect(() => {
    for (const [name, src] of Object.entries(SOUND_MAP)) {
      if (!howlCache.current.has(name)) {
        howlCache.current.set(
          name,
          new Howl({
            src: [src],
            volume: SOUND_VOLUMES[name as SoundName],
            preload: true,
          })
        );
      }
    }
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (isMuted) return;
      const howl = howlCache.current.get(name);
      if (howl) {
        howl.volume(SOUND_VOLUMES[name]);
        howl.play();
      }
    },
    [isMuted]
  );

  const playAmbient = useCallback(
    (src: string, options?: { loop?: boolean; volume?: number }): Howl | null => {
      if (isMuted) return null;
      const howl = new Howl({
        src: [src],
        loop: options?.loop ?? true,
        volume: options?.volume ?? 0.1,
      });
      howl.play();
      return howl;
    },
    [isMuted]
  );

  return { play, playAmbient };
}
