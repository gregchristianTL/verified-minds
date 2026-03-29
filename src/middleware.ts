/**
 * Next.js Middleware
 *
 * Applies security headers to all responses and in-memory rate limiting
 * on sensitive API endpoints (auth, verification, LLM-consuming routes).
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per-IP)
// ---------------------------------------------------------------------------

/** Tracks request count and window expiry for a single rate-limit key */
interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;

const RATE_LIMITS: Record<string, number> = {
  "/api/expertise/verify": 10,
  "/api/auth/openai-realtime": 5,
  "/api/v1/chat": 30,
  "/api/v1/agents": 20,
  "/api/expertise/query": 30,
};

/**
 * Look up the rate limit for a given API path.
 *
 * @param pathname - the request pathname to match against prefixes
 * @returns the per-minute limit, or null if the path is not rate-limited
 */
function getRateLimit(pathname: string): number | null {
  for (const [prefix, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) return limit;
  }
  return null;
}

/**
 * Check whether a rate-limit key has exceeded its allowed requests.
 *
 * @param key - composite key of IP + pathname
 * @param limit - maximum requests allowed per window
 * @returns true if the caller should be throttled
 */
function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore) {
    if (now >= bucket.resetAt) rateLimitStore.delete(key);
  }
}, RATE_WINDOW_MS);

// ---------------------------------------------------------------------------
// Middleware handler
// ---------------------------------------------------------------------------

/**
 * Applies rate limiting and security headers to every request.
 *
 * @param req - incoming Next.js request
 * @returns response with security headers applied
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const limit = getRateLimit(pathname);
    if (limit !== null) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const key = `${ip}:${pathname}`;

      if (isRateLimited(key, limit)) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 },
        );
      }
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self)",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ascii-art.mp4).*)",
  ],
};
