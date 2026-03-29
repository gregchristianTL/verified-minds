/**
 * Next.js Middleware
 *
 * Applies security headers to all responses. Rate limiting is handled
 * at the platform / API-route level rather than in Edge middleware.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Applies security headers to every request.
 *
 * @param req - incoming Next.js request
 * @returns response with security headers applied
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_req: NextRequest): NextResponse {
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
    "/((?!_next/static|_next/image|favicon.ico|ascii-art.mp4|sounds/).*)",
  ],
};
