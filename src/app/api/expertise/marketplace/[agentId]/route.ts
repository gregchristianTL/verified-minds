import { NextRequest, NextResponse } from "next/server";
import { listLiveExperts } from "@/lib/services/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<NextResponse> {
  const { agentId } = await params;
  const experts = listLiveExperts();
  const expert = experts.find((e) => e.id === agentId);

  if (!expert) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({ expert });
}
