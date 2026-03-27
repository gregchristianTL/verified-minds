import { NextResponse } from "next/server";
import { listLiveExperts } from "@/lib/services/marketplace";

export async function GET(): Promise<NextResponse> {
  const experts = listLiveExperts();
  return NextResponse.json({ experts });
}
