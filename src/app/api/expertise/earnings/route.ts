import { NextRequest, NextResponse } from "next/server";
import { getEarningsForProfile } from "@/lib/services/earnings";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const profileId = req.nextUrl.searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  const data = getEarningsForProfile(profileId);

  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
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
