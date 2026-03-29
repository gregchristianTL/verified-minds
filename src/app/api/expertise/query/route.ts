import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runAgent } from "@/lib/adin/agents";
import { getCustomAgentDefinitions } from "@/lib/adin/custom-agents";
import { assembleAgentTools } from "@/lib/adin/tools";
import { db } from "@/lib/db";
import { verifiedUsers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { recordEarning } from "@/lib/services/earnings";
import { getExpertForQuery } from "@/lib/services/marketplace";
import { apiError, apiErrorFromCatch,apiSuccess } from "@/lib/utils/apiResponse";
import { resourceServer, withX402, X402_PAY_TO } from "@/lib/x402/server";
import { sendEarningsNotification } from "@/lib/xmtp/notifications";

const QUERY_PRICE = "$0.05";
const NETWORK = "eip155:84532"; // Base Sepolia

const QuerySchema = z.object({
  profileId: z.string().uuid(),
  question: z.string().min(1).max(5000),
});

/**
 * Query an expert agent directly.
 * x402 payment required -- $0.05 USDC on Base Sepolia.
 * @param req
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = QuerySchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { profileId, question } = parsed.data;

  const expert = await getExpertForQuery(profileId);
  if (!expert) {
    return apiError("Agent not found", 404);
  }

  const { profile, domains } = expert;

  if (!profile.adinAgentId) {
    return apiError("Agent not published yet", 404);
  }

  try {
    const customAgents = await getCustomAgentDefinitions();
    const agentDef = customAgents[profile.adinAgentId];

    if (!agentDef) {
      return apiError("Agent definition not found", 404);
    }

    const toolContext = {
      userId: profile.userId,
      conversationId: crypto.randomUUID(),
      lastUserMessageText: question,
      taskBudget: {
        complexity: "moderate" as const,
        initialSteps: 4,
        maxSteps: 8,
        shouldDelegate: false,
        classifierMethod: "regex" as const,
      },
    };

    const agentTools = assembleAgentTools(toolContext, agentDef);
    const result = await runAgent(agentDef, question, undefined, agentTools);

    if (!result.success) {
      return apiError(result.error ?? "Agent failed to respond", 500);
    }

    const amount = 0.05;
    const summary =
      question.length > 100 ? question.slice(0, 97) + "..." : question;

    const earningId = await recordEarning({
      profileId,
      querySummary: summary,
      domainTag: domains[0] ?? null,
      amount,
      txHash: null,
    });

    const [user] = await db
      .select()
      .from(verifiedUsers)
      .where(eq(verifiedUsers.id, profile.userId))
      .limit(1);

    if (user?.walletAddress) {
      sendEarningsNotification({
        walletAddress: user.walletAddress,
        amount,
        querySummary: summary,
        domainTag: domains[0] ?? null,
      }).catch(() => {});
    }

    return apiSuccess({
      answer: result.response,
      earningId,
      amount,
      toolsUsed: result.toolsUsed,
    });
  } catch (error: unknown) {
    logger.error("Expert query failed", {
      profileId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return apiErrorFromCatch(error, "Query failed");
  }
}

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: QUERY_PRICE,
        network: NETWORK,
        payTo: X402_PAY_TO,
      },
    ],
    description: "Query a verified expert agent",
    mimeType: "application/json",
  },
  resourceServer,
);
