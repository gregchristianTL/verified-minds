import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { findOrCreateProfile } from "@/lib/services/profiles";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";
import { verifyWorldIdProof } from "@/lib/world-id/verify";

const VerifySchema = z.object({
  proof: z.object({
    merkle_root: z.string(),
    nullifier_hash: z.string(),
    proof: z.string(),
    verification_level: z.enum(["orb", "device"]).optional().default("device"),
  }),
  walletAddress: z.string().optional(),
});

/**
 * POST /api/expertise/verify
 *
 * Verifies a World ID proof and creates (or finds) the user's profile.
 * Sets a signed HTTP-only session cookie on success.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = VerifySchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { proof, walletAddress } = parsed.data;

  const { verified, nullifierHash } = await verifyWorldIdProof(proof);

  if (!verified) {
    logger.warn("World ID verification failed", {
      nullifierHash: proof.nullifier_hash,
    });
    return apiError("Verification failed", 401);
  }

  const result = await findOrCreateProfile({
    worldIdHash: nullifierHash,
    walletAddress: walletAddress ?? null,
    verificationLevel: proof.verification_level,
  });

  await createSession({
    userId: result.userId,
    profileId: result.profileId,
    worldIdHash: nullifierHash,
  });

  return apiSuccess({ ...result, walletAddress: walletAddress ?? null });
}
