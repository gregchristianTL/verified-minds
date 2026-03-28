"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VerificationLevel } from "@worldcoin/minikit-js";
import type { ISuccessResult, IErrorState } from "@worldcoin/idkit";
import { useSoundSystem } from "@/hooks/useSoundSystem";

interface UseWorldVerifyReturn {
  /** Trigger MiniKit verification (World App only) */
  verifyWithMiniKit: () => void;
  /** Handle successful IDKit proof — sends to server, stores session, routes */
  handleIdKitSuccess: (result: ISuccessResult) => void;
  /** Handle IDKit widget errors */
  handleIdKitError: (error: IErrorState) => void;
  verifying: boolean;
  error: string | null;
  /** True when running inside the World App (MiniKit available) */
  isMiniKit: boolean;
}

/**
 * Shared hook for World ID verification.
 *
 * Two flows:
 *  - MiniKit (World App): call `verifyWithMiniKit()` to trigger in-app verification.
 *  - IDKit (browser): render `<IDKitWidget>` and pass `handleIdKitSuccess` / `handleIdKitError`.
 */
export function useWorldVerify(): UseWorldVerifyReturn {
  const router = useRouter();
  const { play } = useSoundSystem();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydration-safe: default to false so SSR and first client render match
  const [isMiniKit, setIsMiniKit] = useState(false);
  useEffect(() => {
    setIsMiniKit("MiniKit" in window);
  }, []);

  // POST proof to our API, persist session, and navigate
  const submitProof = useCallback(
    async (proof: Record<string, unknown>, walletAddress?: string) => {
      const res = await fetch("/api/expertise/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, walletAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");

      sessionStorage.setItem("profileId", data.profileId);
      sessionStorage.setItem("userId", data.userId);
      sessionStorage.setItem(
        "knowledgeItemCount",
        String(data.knowledgeItemCount ?? 0),
      );
      if (data.walletAddress) {
        sessionStorage.setItem("walletAddress", data.walletAddress);
      }

      play("success");
      router.push(data.profileStatus === "live" ? "/done" : "/interview");
    },
    [router, play],
  );

  // ── MiniKit flow (World App) ────────────────────────────────────────
  const verifyWithMiniKit = useCallback((): void => {
    play("click");
    setVerifying(true);
    setError(null);

    (async () => {
      try {
        const { MiniKit } = await import("@worldcoin/minikit-js");

        if (!MiniKit.isInstalled()) {
          setError("Please open this in World App");
          play("error");
          return;
        }

        const result = await MiniKit.commandsAsync.verify({
          action: process.env.NEXT_PUBLIC_WORLD_ACTION ?? "verify-expertise",
          verification_level: VerificationLevel.Device,
        });

        if (!result.finalPayload) {
          setError("Verification cancelled");
          play("error");
          return;
        }

        await submitProof(result.finalPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        play("error");
      } finally {
        setVerifying(false);
      }
    })();
  }, [play, submitProof]);

  // ── IDKit flow (browser) ────────────────────────────────────────────
  const handleIdKitSuccess = useCallback(
    (result: ISuccessResult): void => {
      setVerifying(true);
      setError(null);

      submitProof({ ...result })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Verification failed");
          play("error");
        })
        .finally(() => setVerifying(false));
    },
    [submitProof, play],
  );

  const handleIdKitError = useCallback(
    (error: IErrorState): void => {
      setError(error.message ?? "World ID verification failed");
      play("error");
    },
    [play],
  );

  return {
    verifyWithMiniKit,
    handleIdKitSuccess,
    handleIdKitError,
    verifying,
    error,
    isMiniKit,
  };
}
