import { NextRequest, NextResponse } from "next/server";

import { listLiveExperts } from "@/lib/services/marketplace";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";

/**
 * GET /api/expertise/marketplace/:agentId -- single expert listing
 * @param _req
 * @param root0
 * @param root0.params
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<NextResponse> {
  const { agentId } = await params;
  const experts = await listLiveExperts();
  const expert = experts.find((e) => e.id === agentId);

  if (!expert) {
    return apiError("Agent not found", 404);
  }

  return apiSuccess({ expert });
}
