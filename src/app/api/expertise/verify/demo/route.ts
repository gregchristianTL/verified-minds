import { NextResponse } from "next/server";
import { findOrCreateProfile } from "@/lib/services/profiles";

const DEMO_NULLIFIER = "demo-nullifier-00000000-0000-0000-0000-000000000000";

/** Bypass World ID verification for demo purposes */
export async function POST(): Promise<NextResponse> {
  const result = findOrCreateProfile({
    worldIdHash: DEMO_NULLIFIER,
    walletAddress: null,
    verificationLevel: "demo",
  });

  return NextResponse.json({ ...result, walletAddress: null });
}
