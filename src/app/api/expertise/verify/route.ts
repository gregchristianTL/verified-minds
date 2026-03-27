import { NextRequest, NextResponse } from "next/server";
import { verifyWorldIdProof } from "@/lib/world-id/verify";
import { findOrCreateProfile } from "@/lib/services/profiles";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { proof, walletAddress } = body;

  if (!proof?.nullifier_hash) {
    return NextResponse.json({ error: "Missing proof" }, { status: 400 });
  }

  const { verified, nullifierHash } = await verifyWorldIdProof(proof);

  if (!verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  const result = findOrCreateProfile({
    worldIdHash: nullifierHash,
    walletAddress: walletAddress ?? null,
    verificationLevel: proof.verification_level ?? "device",
  });

  return NextResponse.json(result);
}
