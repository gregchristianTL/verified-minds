"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VerificationLevel } from "@worldcoin/minikit-js";

export default function ExpertiseLanding(): React.ReactElement {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(): Promise<void> {
    setVerifying(true);
    setError(null);

    try {
      const isMiniKit =
        typeof window !== "undefined" && "MiniKit" in window;

      if (isMiniKit) {
        const { MiniKit } = await import("@worldcoin/minikit-js");

        if (!MiniKit.isInstalled()) {
          setError("Please open this in World App");
          setVerifying(false);
          return;
        }

        const result = await MiniKit.commandsAsync.verify({
          action: process.env.NEXT_PUBLIC_WORLD_ACTION ?? "verify-expertise",
          verification_level: VerificationLevel.Device,
        });

        if (!result.finalPayload) {
          setError("Verification cancelled");
          setVerifying(false);
          return;
        }

        const res = await fetch("/api/expertise/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof: result.finalPayload }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        sessionStorage.setItem("profileId", data.profileId);
        sessionStorage.setItem("userId", data.userId);

        if (data.profileStatus === "live") {
          router.push("/expertise/done");
        } else {
          router.push("/expertise/interview");
        }
      } else {
        const res = await fetch("/api/expertise/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: {
              merkle_root: "demo",
              nullifier_hash: `demo-${Date.now()}`,
              proof: "demo",
              verification_level: "device",
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        sessionStorage.setItem("profileId", data.profileId);
        sessionStorage.setItem("userId", data.userId);

        if (data.profileStatus === "live") {
          router.push("/expertise/done");
        } else {
          router.push("/expertise/interview");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="max-w-sm w-full text-center space-y-10">
      {/* Friendly logo mark */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-3xl bg-[var(--accent-bg)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M12 17v5" />
            <path d="M9 22h6" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Your expertise has value
        </h1>
        <p className="text-[var(--muted)] text-base leading-relaxed">
          Have a quick chat with our AI. We&apos;ll turn what you know into an
          agent that answers questions on your behalf — and pays you every time.
        </p>
      </div>

      {/* How it works — friendly steps */}
      <div className="flex justify-center gap-6 text-left">
        {[
          { step: "1", label: "Verify you're real" },
          { step: "2", label: "15 min voice chat" },
          { step: "3", label: "Earn while you sleep" },
        ].map(({ step, label }) => (
          <div key={step} className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-sm font-semibold flex items-center justify-center">
              {step}
            </div>
            <p className="text-xs text-[var(--muted)] text-center max-w-[80px]">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full py-3.5 px-6 rounded-2xl bg-[var(--accent)] text-white font-medium text-base
                     shadow-[var(--shadow-md)] hover:opacity-90 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Verifying...
            </span>
          ) : (
            "Get Started"
          )}
        </button>

        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-100">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      <Link
        href="/expertise/marketplace"
        className="block text-[var(--muted)] text-sm hover:text-[var(--accent)] transition-colors"
      >
        Looking to ask an expert? Browse here
      </Link>
    </div>
  );
}
