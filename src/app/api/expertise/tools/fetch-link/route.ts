import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSession,requireSession } from "@/lib/auth/session";
import { apiError,apiSuccess } from "@/lib/utils/apiResponse";
import { safeFetch, SSRFError } from "@/lib/utils/safeFetch";

const FetchLinkSchema = z.object({
  url: z.string().url(),
  context: z.string().optional(),
});

/**
 * POST /api/expertise/tools/fetch-link
 *
 * Fetches and extracts text content from a URL mentioned during interview.
 * Requires session. Applies SSRF protections to block private/reserved IPs.
 * @param req
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireSession(req);
  if (!isSession(session)) return session;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return apiError("Invalid JSON", 400, { errorCode: "INVALID_JSON" });
  }

  const parsed = FetchLinkSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError("Invalid request", 400, {
      errorCode: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  const { url, context } = parsed.data;

  try {
    const res = await safeFetch(url, {
      headers: { "User-Agent": "VerifiedMinds/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return apiSuccess({ error: `Failed to fetch: ${res.status}`, fetched: false });
    }

    const html = await res.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20_000);

    return apiSuccess({ fetched: true, content: text, url, context });
  } catch (error: unknown) {
    if (error instanceof SSRFError) {
      return apiError(error.message, 400, { errorCode: "SSRF_BLOCKED" });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiSuccess({ error: `Fetch failed: ${message}`, fetched: false });
  }
}
