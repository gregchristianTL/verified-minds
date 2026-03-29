/**
 * API key authentication for the v1 agent API.
 *
 * Checks for a Bearer token in the Authorization header and validates
 * it against the ADIN_API_KEY environment variable. When no API key
 * is configured, access is denied by default in production and allowed
 * in development for convenience.
 */

import { NextResponse } from "next/server";

/**
 * Validate the API key from the Authorization header.
 * Accepts both NextRequest and standard Request (for non-Next.js route handlers).
 *
 * @param req - the incoming request
 * @returns null if valid, or a NextResponse error if authentication fails
 */
export function requireApiKey(req: Pick<Request, "headers">): NextResponse | null {
  const configuredKey = process.env.ADIN_API_KEY;

  if (!configuredKey) {
    if (process.env.NODE_ENV === "development") return null;
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing API key. Use Authorization: Bearer <key>" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);

  if (token !== configuredKey) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 403 },
    );
  }

  return null;
}
