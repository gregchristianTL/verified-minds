"use client";

import type { IErrorState,ISuccessResult } from "@worldcoin/idkit";
import { VerificationLevel } from "@worldcoin/minikit-js";
import { useRouter } from "next/navigation";
import { useCallback,useEffect, useState } from "react";

import { unwrap } from "@/lib/api/unwrap";
import { useSoundSystem } from "@/hooks/useSoundSystem";

const BYPASS_LOGIN =
  process.env.NEXT_PUBLIC_BYPASS_WORLD_LOGIN === "true";

/**
 *
 */
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
  /** True when World ID verification is bypassed via env var */
  bypassLogin: boolean;
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

  /** Save session data returned by any verify endpoint and navigate */
  const persistAndNavigate = useCallback(
    (data: Record<string, unknown>) => {
      sessionStorage.setItem("profileId", data.profileId as string);
      sessionStorage.setItem("userId", data.userId as string);
      sessionStorage.setItem(
        "knowledgeItemCount",
        String(data.knowledgeItemCount ?? 0),
      );
      if (data.walletAddress) {
        sessionStorage.setItem("walletAddress", data.walletAddress as string);
      }

      play("success");
      router.push(
        data.profileStatus === "live" ? "/done" : "/interview",
      );
    },
    [router, play],
  );

  /** Bypass flow — skip World ID entirely and hit the demo endpoint */
  const submitBypass = useCallback(async () => {
    const res = await fetch("/api/expertise/verify/demo", { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Bypass login failed");
    persistAndNavigate(unwrap(json));
  }, [persistAndNavigate]);

  // POST proof to our API, persist session, and navigate
  const submitProof = useCallback(
    async (proof: Record<string, unknown>, walletAddress?: string) => {
      const res = await fetch("/api/expertise/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, walletAddress }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Verification failed");
      persistAndNavigate({ ...unwrap(json), walletAddress: walletAddress ?? null });
    },
    [persistAndNavigate],
  );

  // ── MiniKit flow (World App) — or bypass when env var is set ────────
  const verifyWithMiniKit = useCallback((): void => {
    play("click");
    setVerifying(true);
    setError(null);

    (async () => {
      try {
        if (BYPASS_LOGIN) {
          await submitBypass();
          return;
        }

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
  }, [play, submitProof, submitBypass]);

  // ── IDKit flow (browser) — or bypass when env var is set ────────────
  const handleIdKitSuccess = useCallback(
    (result: ISuccessResult): void => {
      setVerifying(true);
      setError(null);

      const action = BYPASS_LOGIN
        ? submitBypass()
        : submitProof({ ...result });

      action
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Verification failed");
          play("error");
        })
        .finally(() => setVerifying(false));
    },
    [submitProof, submitBypass, play],
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
    bypassLogin: BYPASS_LOGIN,
  };
}
