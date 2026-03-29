import { NextRequest, NextResponse } from "next/server";

import { listLiveExperts } from "@/lib/services/marketplace";
import { apiSuccess } from "@/lib/utils/apiResponse";
import { X402_NETWORK } from "@/lib/x402/server";

/**
 * GET /api/agents
 *
 * Public agent index -- machine-readable directory of all verified agents.
 * No auth required. Other agents/services crawl this to discover
 * available experts and their x402-gated query endpoints.
 * @param req
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = req.nextUrl.origin;
  const experts = await listLiveExperts();
  const network = X402_NETWORK;

  const agents = experts.map((e) => ({
    id: e.id,
    name: e.displayName,
    bio: e.bio,
    domains: e.domains,
    endpoint: `${origin}/api/expertise/query`,
    method: "POST",
    bodySchema: {
      profileId: e.id,
      question: "<string>",
    },
    price: parseFloat(e.queryPrice).toFixed(2),
    currency: "USDC",
    network,
    protocol: "x402",
  }));

  return apiSuccess({
    agents,
    meta: {
      count: agents.length,
      protocol: "x402",
      description:
        "Verified Minds agent index. Each agent is a real human's knowledge, verified by World ID, queryable via x402 micropayment.",
    },
  });
}
