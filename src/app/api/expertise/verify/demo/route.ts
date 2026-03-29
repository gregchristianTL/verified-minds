import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createSession } from "@/lib/auth/session";
import { findOrCreateProfile } from "@/lib/services/profiles";
import { apiError, apiSuccess } from "@/lib/utils/apiResponse";

const DEMO_NULLIFIER =
  "demo-nullifier-00000000-0000-0000-0000-000000000000";

const DEMO_MODE =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const BodySchema = z
  .object({ walletAddress: z.string().optional() })
  .optional();

/**
 * POST /api/expertise/verify/demo
 *
 * Bypass World ID verification for development and staged demos.
 * Enabled when NODE_ENV=development OR NEXT_PUBLIC_DEMO_MODE=true.
 * Accepts an optional { walletAddress } body for XMTP notification testing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!DEMO_MODE) {
    return apiError("Not found", 404);
  }

  let walletAddress: string | null = null;
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    walletAddress = parsed.success ? (parsed.data?.walletAddress ?? null) : null;
  } catch {
    // no body is fine
  }

  const result = await findOrCreateProfile({
    worldIdHash: DEMO_NULLIFIER,
    walletAddress,
    verificationLevel: "demo",
  });

  await createSession({
    userId: result.userId,
    profileId: result.profileId,
    worldIdHash: DEMO_NULLIFIER,
  });

  return apiSuccess({ ...result, walletAddress });
}
