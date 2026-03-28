import { NextRequest, NextResponse } from "next/server";
import { withX402, resourceServer, X402_PAY_TO } from "@/lib/x402/server";
import { sendEarningsNotification } from "@/lib/xmtp/notifications";
import { getExpertForQuery } from "@/lib/services/marketplace";
import { recordEarning } from "@/lib/services/earnings";
import { getCustomAgentDefinitions } from "@/lib/adin/custom-agents";
import { runAgent } from "@/lib/adin/agents";
import { assembleAgentTools } from "@/lib/adin/tools";
import { db } from "@/lib/db";
import { verifiedUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const QUERY_PRICE = "$0.05";
const NETWORK = "eip155:84532"; // Base Sepolia

/**
 * Query an expert agent directly.
 * x402 payment required — $0.05 USDC on Base Sepolia.
 * Bypasses the orchestrator and calls the expert agent's runner
 * with its own system prompt, tools, and model tier.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { profileId, question } = body;

  if (!profileId || !question) {
    return NextResponse.json(
      { error: "profileId and question required" },
      { status: 400 },
    );
  }

  const expert = getExpertForQuery(profileId);

  if (!expert) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { profile, domains } = expert;

  if (!profile.adinAgentId) {
    return NextResponse.json({ error: "Agent not published yet" }, { status: 404 });
  }

  try {
    // Look up the agent definition directly and run it — no orchestrator hop
    const customAgents = getCustomAgentDefinitions();
    const agentDef = customAgents[profile.adinAgentId];

    if (!agentDef) {
      return NextResponse.json({ error: "Agent definition not found" }, { status: 404 });
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
      return NextResponse.json(
        { error: result.error ?? "Agent failed to respond" },
        { status: 500 },
      );
    }

    const amount = 0.05;
    const summary =
      question.length > 100 ? question.slice(0, 97) + "..." : question;

    const earningId = recordEarning({
      profileId,
      querySummary: summary,
      domainTag: domains[0] ?? null,
      amount,
      txHash: null,
    });

    const [user] = db
      .select()
      .from(verifiedUsers)
      .where(eq(verifiedUsers.id, profile.userId))
      .limit(1)
      .all();

    if (user?.walletAddress) {
      sendEarningsNotification({
        walletAddress: user.walletAddress,
        amount,
        querySummary: summary,
        domainTag: domains[0] ?? null,
      }).catch(() => {});
    }

    return NextResponse.json({
      answer: result.response,
      earningId,
      amount,
      toolsUsed: result.toolsUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
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
