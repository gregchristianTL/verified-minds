import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import { getEarningsForProfile } from "@/lib/services/earnings";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";

const QuerySchema = z.object({
  profileId: z.string().uuid(),
});

/**
 * GET /api/expertise/earnings?profileId=...
 *
 * Returns earnings summary and recent transactions for the authenticated user.
 * @param req
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  const parsed = QuerySchema.safeParse({
    profileId: req.nextUrl.searchParams.get("profileId"),
  });

  if (!parsed.success) {
    return apiError("profileId required (UUID)", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId } = parsed.data;

  if (profileId !== session.profileId) {
    return apiError("Forbidden", 403);
  }

  const data = await getEarningsForProfile(profileId);

  if (!data) {
    return apiError("Profile not found", 404);
  }

  return apiSuccess({
    ...data,
    transactions: data.transactions.map((t) => ({
      id: t.id,
      querySummary: t.querySummary,
      domainTag: t.domainTag,
      amount: t.amount,
      txHash: t.txHash,
      createdAt: t.createdAt,
    })),
  });
}
