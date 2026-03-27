import { NextRequest, NextResponse } from "next/server";
import { queryExpertAgent } from "@/lib/adin/client";
import { requirePayment, extractPayment } from "@/lib/x402/middleware";
import { sendEarningsNotification } from "@/lib/xmtp/notifications";
import { getExpertForQuery } from "@/lib/services/marketplace";
import { recordEarning } from "@/lib/services/earnings";
import { db } from "@/lib/db";
import { verifiedUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Query an expert agent.
 * x402 payment required — amount must meet the expert's query price.
 * Delegates to the custom agent via ADIN's v1 chat.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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

  // x402 payment gate
  const queryPrice = parseFloat(profile.queryPrice ?? "0.05");
  const paymentError = requirePayment(req, queryPrice);
  if (paymentError) return paymentError;

  const payment = extractPayment(req);

  try {
    const delegationPrompt = `Please delegate this question to the "${profile.adinAgentId}" agent: ${question}`;

    const response = await queryExpertAgent({
      messages: [{ role: "user", content: delegationPrompt }],
      stream: false,
    });

    const amount = payment?.amount ?? queryPrice;
    const summary =
      question.length > 100 ? question.slice(0, 97) + "..." : question;

    const earningId = recordEarning({
      profileId,
      querySummary: summary,
      domainTag: domains[0] ?? null,
      amount,
      txHash: payment?.txHash,
    });

    // Fire-and-forget XMTP notification
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
      answer: response.text,
      earningId,
      amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
