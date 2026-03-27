"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { VerificationLevel } from "@worldcoin/minikit-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { staggerContainer, fadeInUp, scaleIn, gentle } from "@/lib/motion";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { Loader2, Mic, AlertCircle } from "lucide-react";

export default function ExpertiseLanding(): React.ReactElement {
  const router = useRouter();
  const { play } = useSoundSystem();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(): Promise<void> {
    play("click");
    setVerifying(true);
    setError(null);

    try {
      const isMiniKit =
        typeof window !== "undefined" && "MiniKit" in window;

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

        const res = await fetch("/api/expertise/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof: result.finalPayload }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        sessionStorage.setItem("profileId", data.profileId);
        sessionStorage.setItem("userId", data.userId);

        play("success");
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

        play("success");
        if (data.profileStatus === "live") {
          router.push("/expertise/done");
        } else {
          router.push("/expertise/interview");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      play("error");
    } finally {
      setVerifying(false);
    }
  }

  const steps = [
    { step: "1", label: "Verify you're real" },
    { step: "2", label: "15 min voice chat" },
    { step: "3", label: "Earn while you sleep" },
  ];

  return (
    <motion.div
      className="max-w-sm w-full text-center space-y-10"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Logo mark */}
      <motion.div className="flex justify-center" variants={scaleIn} transition={gentle}>
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Mic className="size-7 text-primary" />
        </div>
      </motion.div>

      <motion.div className="space-y-3" variants={fadeInUp} transition={gentle}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your expertise has value
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Have a quick chat with our AI. We&apos;ll turn what you know into an
          agent that answers questions on your behalf — and pays you every time.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div
        className="flex justify-center gap-6 text-left"
        variants={fadeInUp}
        transition={gentle}
      >
        {steps.map(({ step, label }, i) => (
          <motion.div
            key={step}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, ...gentle }}
          >
            <Badge
              variant="secondary"
              className="w-8 h-8 rounded-full p-0 flex items-center justify-center text-sm font-semibold"
            >
              {step}
            </Badge>
            <p className="text-xs text-muted-foreground text-center max-w-[80px]">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="space-y-3" variants={fadeInUp} transition={gentle}>
        <Button
          onClick={handleVerify}
          disabled={verifying}
          size="lg"
          className="w-full py-6 rounded-2xl text-base font-medium shadow-lg
                     hover:shadow-xl transition-shadow active:scale-[0.98]"
        >
          {verifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Verifying...
            </span>
          ) : (
            "Get Started"
          )}
        </Button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={fadeInUp} transition={gentle}>
        <Link
          href="/expertise/marketplace"
          className="block text-muted-foreground text-sm hover:text-primary transition-colors"
          onClick={() => play("navigate")}
        >
          Looking to ask an expert? Browse here
        </Link>
      </motion.div>
    </motion.div>
  );
}
