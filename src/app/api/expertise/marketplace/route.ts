import { NextResponse } from "next/server";

import { listLiveExperts } from "@/lib/services/marketplace";
import { apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

/** GET /api/expertise/marketplace -- public listing of live experts */
export async function GET(): Promise<NextResponse> {
  try {
    const experts = await listLiveExperts();
    return apiSuccess({ experts });
  } catch (error: unknown) {
    return apiErrorFromCatch(error, "Failed to load marketplace");
  }
}
