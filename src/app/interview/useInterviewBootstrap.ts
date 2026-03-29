"use client";

import { useEffect, useRef, useState } from "react";

import type { PhaseId } from "@/components/ProgressBar";
import { unwrap } from "@/lib/api/unwrap";

const TARGET_KNOWLEDGE_ITEMS = 5;

/**
 * Return type for the useInterviewBootstrap hook
 */
export interface BootstrapState {
  profileIdRef: React.RefObject<string>;
  userIdentity: string;
  balance: string;
  setBalance: (b: string) => void;
  initialKnowledgeCount: number;
  knowledgeCount: number;
  setKnowledgeCount: React.Dispatch<React.SetStateAction<number>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  currentPhase: PhaseId;
  setCurrentPhase: React.Dispatch<React.SetStateAction<PhaseId>>;
  completedPhases: Set<string>;
  setCompletedPhases: React.Dispatch<React.SetStateAction<Set<string>>>;
  statusHint: string;
  setStatusHint: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Loads profileId from sessionStorage, fetches earnings and profile data,
 * and seeds returning-user state (progress, phase, time estimate).
 *
 * Redirects to "/" if no profileId is found.
 * @param redirectToHome
 */
export function useInterviewBootstrap(
  redirectToHome: () => void,
): BootstrapState {
  const profileIdRef = useRef("");
  const [userIdentity, setUserIdentity] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [initialKnowledgeCount, setInitialKnowledgeCount] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<PhaseId>("intro_domain");
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(
    new Set(),
  );
  const [statusHint, setStatusHint] = useState("");

  useEffect(() => {
    const storedProfileId = sessionStorage.getItem("profileId") ?? "";
    profileIdRef.current =
      storedProfileId && storedProfileId !== "undefined" ? storedProfileId : "";
    setUserIdentity(
      sessionStorage.getItem("walletAddress") ||
        sessionStorage.getItem("userId") ||
        "",
    );
    if (!profileIdRef.current) {
      redirectToHome();
      return;
    }

    const pid = profileIdRef.current;

    fetch(`/api/expertise/earnings?profileId=${pid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json ? unwrap(json) : null;
        if (data?.totalEarnings) {
          setBalance(parseFloat(data.totalEarnings).toFixed(2));
        }
      })
      .catch(() => {});

    fetch(`/api/expertise/profiles?profileId=${encodeURIComponent(pid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json ? unwrap(json) : null;
        if (!data) return;
        const count: number = data.knowledgeItemCount ?? 0;
        setInitialKnowledgeCount(count);
        if (count > 0) {
          setKnowledgeCount(count);
          setProgress(Math.min((count / TARGET_KNOWLEDGE_ITEMS) * 100, 60));
          setStatusHint("Welcome back — tap to pick up where you left off");

          const confidenceMap: Record<string, number> =
            data.confidenceMap ?? {};
          const domainCount = Object.keys(confidenceMap).length;
          if (domainCount > 0) {
            setCompletedPhases(new Set(["intro_domain"]));
            setCurrentPhase("unique_signal");
            if (count >= 3) {
              setCompletedPhases(new Set(["intro_domain", "unique_signal"]));
              setCurrentPhase("wrap");
            }
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    profileIdRef,
    userIdentity,
    balance,
    setBalance,
    initialKnowledgeCount,
    knowledgeCount,
    setKnowledgeCount,
    progress,
    setProgress,
    currentPhase,
    setCurrentPhase,
    completedPhases,
    setCompletedPhases,
    statusHint,
    setStatusHint,
  };
}
