"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VerificationLevel } from "@worldcoin/minikit-js";
import { useSoundSystem } from "@/hooks/useSoundSystem";

interface UseWorldVerifyReturn {
  verify: () => Promise<void>;
  verifying: boolean;
  error: string | null;
}

/**
 * Shared hook for World ID verification.
 * Handles MiniKit vs demo browser flow, stores session, and routes to interview or done.
 */
export function useWorldVerify(): UseWorldVerifyReturn {
  const router = useRouter();
  const { play } = useSoundSystem();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (): Promise<void> => {
    play("click");
    setVerifying(true);
    setError(null);

    try {
      const isMiniKit =
        typeof window !== "undefined" && "MiniKit" in window;

      let proof: Record<string, unknown>;

      if (isMiniKit) {
        const { MiniKit } = await import("@worldcoin/minikit-js");

        if (!MiniKit.isInstalled()) {
          setError("Please open this in World App");
          play("error");
          setVerifying(false);
          return;
        }

        const result = await MiniKit.commandsAsync.verify({
          action: process.env.NEXT_PUBLIC_WORLD_ACTION ?? "verify-expertise",
          verification_level: VerificationLevel.Device,
        });

        if (!result.finalPayload) {
          setError("Verification cancelled");
          play("error");
          setVerifying(false);
          return;
        }

        proof = result.finalPayload;
      } else {
        proof = {
          merkle_root: "demo",
          nullifier_hash: `demo-${Date.now()}`,
          proof: "demo",
          verification_level: "device",
        };
      }

      // In demo mode, generate a realistic wallet address for the ASCII identity
      const demoWallet = isMiniKit
        ? undefined
        : `0x${Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, "0")).join("")}`;

      const res = await fetch("/api/expertise/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof, walletAddress: demoWallet }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem("profileId", data.profileId);
      sessionStorage.setItem("userId", data.userId);
      if (data.walletAddress) {
        sessionStorage.setItem("walletAddress", data.walletAddress);
      }

      play("success");
      if (data.profileStatus === "live") {
        router.push("/expertise/done");
      } else {
        router.push("/expertise/interview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      play("error");
    } finally {
      setVerifying(false);
    }
  }, [router, play]);

  return { verify, verifying, error };
}
