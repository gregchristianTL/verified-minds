import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch and extract content from a URL mentioned during the interview.
 * Uses a simple fetch + text extraction approach.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { url, context } = body;

  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VerifiedMinds/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `Failed to fetch: ${res.status}`,
        fetched: false,
      });
    }

    const html = await res.text();

    // Basic HTML -> text extraction (strip tags, collapse whitespace)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20_000);

    return NextResponse.json({
      fetched: true,
      content: text,
      url,
      context,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: `Fetch failed: ${message}`,
      fetched: false,
    });
  }
}
