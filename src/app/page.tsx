"use client";

import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { motion } from "framer-motion";
import { AlertCircle,Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

import ExpertCard from "@/components/ExpertCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VideoBackground from "@/components/VideoBackground";
import { useSoundSystem } from "@/hooks/useSoundSystem";
import { useWorldVerify } from "@/hooks/useWorldVerify";
import { unwrap } from "@/lib/api/unwrap";
import { fadeInUp, gentle,scaleIn, staggerContainer } from "@/lib/motion";

/**
 *
 */
type ReturningState =
  | { kind: "loading" }
  | { kind: "new" }
  | { kind: "not_started"; profileId: string }
  | { kind: "in_progress"; profileId: string }
  | { kind: "live"; profileId: string };

const CTA_CLASS =
  "inline-flex items-center justify-center h-12 w-full sm:w-1/2 rounded-full bg-primary text-primary-foreground font-heading font-medium text-base shadow-lg hover:shadow-[0_0_30px_rgba(232,104,48,0.35)] transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer";

const BROWSE_CLASS =
  "inline-flex items-center justify-center h-12 w-full sm:w-1/2 rounded-full border border-white/20 text-white/90 font-heading font-medium text-base backdrop-blur-md bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all active:scale-[0.97] cursor-pointer";

/** CTA block shown when a user already has a live agent. */
function LiveAgentCTA({ profileId, liveProfile }: {
  profileId: string;
  liveProfile: { displayName: string; bio: string | null; domains: string[]; queryPrice: string };
}): React.ReactElement {
  return (
    <>
      <div className="w-full">
        <ExpertCard
          id={profileId}
          displayName={liveProfile.displayName}
          bio={liveProfile.bio}
          domains={liveProfile.domains}
          queryPrice={liveProfile.queryPrice}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full items-center sm:items-stretch">
        <div className="flex items-center justify-center w-full sm:w-1/2">
          <Link href="/done" className="text-white/40 text-sm hover:text-primary transition-colors font-mono text-center block mt-2 sm:mt-0">
            View Dashboard
          </Link>
        </div>
        <Link href="/marketplace" className={BROWSE_CLASS}>Browse Agents</Link>
      </div>
    </>
  );
}

/** CTA block for new or returning (non-live) users. */
function DefaultCTA({ returningState, verifying, isMiniKit, bypassLogin, play, handleIdKitSuccess, handleIdKitError, verifyWithMiniKit, router }: {
  returningState: ReturningState;
  verifying: boolean;
  isMiniKit: boolean;
  bypassLogin: boolean;
  play: ReturnType<typeof useSoundSystem>["play"];
  handleIdKitSuccess: ReturnType<typeof useWorldVerify>["handleIdKitSuccess"];
  handleIdKitError: ReturnType<typeof useWorldVerify>["handleIdKitError"];
  verifyWithMiniKit: () => void;
  router: ReturnType<typeof useRouter>;
}): React.ReactElement {
  return (
    <>
      {returningState.kind === "new" && !isMiniKit && !bypassLogin ? (
        <IDKitWidget
          app_id={process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`}
          action={process.env.NEXT_PUBLIC_WORLD_ACTION ?? "verify-expertise"}
          verification_level={VerificationLevel.Device}
          onSuccess={handleIdKitSuccess}
          onError={handleIdKitError}
          autoClose
        >
          {({ open }: { open: () => void }) => (
            <button onClick={() => { play("click"); open(); }} disabled={verifying} className={CTA_CLASS}>
              {verifying ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Verifying...</span>
              ) : "Create My Agent"}
            </button>
          )}
        </IDKitWidget>
      ) : (
        <button
          onClick={() => {
            switch (returningState.kind) {
              case "in_progress":
              case "not_started":
                router.push("/interview");
                break;
              case "live":
                router.push("/done");
                break;
              default:
                verifyWithMiniKit();
            }
          }}
          disabled={verifying || returningState.kind === "loading"}
          className={CTA_CLASS}
        >
          {verifying ? (
            <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Verifying...</span>
          ) : returningState.kind === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : returningState.kind === "in_progress" ? "Continue Interview"
            : returningState.kind === "not_started" ? "Start Interview"
            : returningState.kind === "live" ? "View My Agent"
            : "Create My Agent"}
        </button>
      )}
      <Link href="/marketplace" className={BROWSE_CLASS}>Browse Agents</Link>
    </>
  );
}

/**
 *
 */
export default function MarketingPage(): React.ReactElement {
  const router = useRouter();
  const { play } = useSoundSystem();
  const { verifyWithMiniKit, handleIdKitSuccess, handleIdKitError, verifying, error, isMiniKit, bypassLogin } = useWorldVerify();

  const [returningState, setReturningState] = useState<ReturningState>({ kind: "loading" });
  const [liveProfile, setLiveProfile] = useState<{
    displayName: string; bio: string | null; domains: string[]; queryPrice: string;
  } | null>(null);

  useEffect(() => {
    const rawProfileId = sessionStorage.getItem("profileId");
    const profileId = rawProfileId && rawProfileId !== "undefined" ? rawProfileId : "";
    if (!profileId) { setLiveProfile(null); setReturningState({ kind: "new" }); return; }

    fetch(`/api/expertise/profiles?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json ? unwrap(json) : null;
        if (!data) { setLiveProfile(null); setReturningState({ kind: "new" }); return; }
        if (data.status === "live") {
          setLiveProfile({ displayName: data.displayName, bio: data.bio, domains: data.domains ?? [], queryPrice: data.queryPrice ?? "0.05" });
          setReturningState({ kind: "live", profileId });
        } else {
          setLiveProfile(null);
          setReturningState((data.knowledgeItemCount ?? 0) > 0 ? { kind: "in_progress", profileId } : { kind: "not_started", profileId });
        }
      })
      .catch(() => { setLiveProfile(null); setReturningState({ kind: "new" }); });
  }, []);

  const isLive = returningState.kind === "live" && liveProfile;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <VideoBackground src="/ascii-art.mp4" overlayOpacity={0.45} />

      <motion.div className="relative z-10 max-w-lg w-full text-center space-y-10 px-6" variants={staggerContainer} initial="initial" animate="animate">
        <motion.p className="font-heading text-sm tracking-[0.3em] uppercase text-white/60" variants={scaleIn} transition={gentle}>Verified Minds</motion.p>

        <motion.div className="space-y-4" variants={fadeInUp} transition={gentle}>
          <h1 className="font-heading text-4xl sm:text-5xl font-medium tracking-tight text-white" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>Your expertise has value.</h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-lg mx-auto whitespace-nowrap" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Turn what you know into an AI agent that earns for you.</p>
        </motion.div>

        <motion.div
          className={isLive ? "flex flex-col gap-4 w-full max-w-sm mx-auto" : "flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm mx-auto"}
          variants={fadeInUp} transition={gentle}
        >
          {isLive ? (
            <LiveAgentCTA profileId={returningState.profileId} liveProfile={liveProfile} />
          ) : (
            <DefaultCTA {...{ returningState, verifying, isMiniKit, bypassLogin, play, handleIdKitSuccess, handleIdKitError, verifyWithMiniKit, router }} />
          )}
        </motion.div>

        <motion.div className="flex items-center justify-center gap-2" variants={fadeInUp} transition={gentle}>
          <a href="https://world.org/world-id" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="World ID">
              <path d="M12 24C9.831 24 7.825 23.463 5.987 22.385C4.148 21.31 2.69 19.852 1.615 18.013C.537 16.171 0 14.169 0 12s.537-4.175 1.615-6.013C2.69 4.148 4.148 2.69 5.987 1.615 7.825.537 9.831 0 12 0s4.175.537 6.013 1.615c1.839 1.075 3.297 2.533 4.372 4.372C23.459 7.825 24 9.831 24 12s-.537 4.175-1.615 6.013c-1.075 1.839-2.533 3.297-4.372 4.372C16.175 23.459 14.169 24 12 24zM1.014 13.275v-2.5h21.994v2.5H1.014zM12 21.447c1.702 0 3.267-.42 4.699-1.261 1.431-.841 2.559-1.986 3.383-3.437.825-1.449 1.235-3.034 1.235-4.752 0-1.719-.414-3.3-1.235-4.749-.824-1.448-1.952-2.593-3.383-3.437C15.267 2.97 13.702 2.55 12 2.55s-3.267.42-4.699 1.261C5.87 4.652 4.742 5.796 3.918 7.248 3.093 8.696 2.68 10.281 2.68 11.997s.41 3.315 1.238 4.752c.824 1.448 1.952 2.593 3.383 3.437 1.432.841 2.997 1.261 4.699 1.261zM5.596 12.18v-.314c0-1.231.294-2.346.884-3.344a6.205 6.205 0 0 1 2.487-2.356c1.068-.574 2.286-.858 3.657-.858h8.042l1.041 2.446H12.674c-1.318 0-2.383.387-3.187 1.158-.808.771-1.211 1.755-1.211 2.954v.314c0 1.215.404 2.202 1.211 2.967.808.764 1.869 1.144 3.187 1.144h9.033l-1.041 2.446h-8.042c-1.371 0-2.589-.287-3.657-.858a6.205 6.205 0 0 1-2.487-2.356c-.59-.998-.884-2.112-.884-3.344z" fill="currentColor"/>
            </svg>
            <span className="text-xs font-mono">Powered by World ID</span>
          </a>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
            <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>
          </motion.div>
        )}
      </motion.div>

      <footer className="absolute bottom-0 inset-x-0 z-[1] py-5 px-6 text-center pointer-events-none">
        <p className="font-mono text-xs text-white/30 pointer-events-auto">
          Verified Minds{" "}
          <Link href="/legal" className="text-white/40 hover:text-white/60 transition-colors">v0.1.0</Link>
          {" "}&middot; Built by{" "}
          <a href="https://tributelabs.xyz" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#FF00FF] transition-colors">Tribute Labs</a>{" "}
          for <a href="https://world.org" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">World</a>{" "}
          x <a href="https://coinbase.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#0052FF] transition-colors">Coinbase</a>
        </p>
      </footer>
    </div>
  );
}
