/**
 * Standardized API response helpers.
 *
 * All API routes should use these instead of raw NextResponse.json()
 * to ensure a consistent { data } / { error } envelope.
 */

import { NextResponse } from "next/server";

/** Options for constructing a structured API error response */
interface ApiErrorOptions {
  errorCode?: string;
  details?: unknown;
  status?: number;
}

/**
 * Return a success response wrapped in { data: T }.
 *
 * @param data - the payload to include in the response
 * @param status - HTTP status code (defaults to 200)
 * @returns a NextResponse with the standard envelope
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Return an error response with { error, errorCode?, details? }.
 *
 * @param message - human-readable error description
 * @param status - HTTP status code (defaults to 500)
 * @param opts - optional errorCode and details to include
 * @returns a NextResponse with the error envelope
 */
export function apiError(
  message: string,
  status = 500,
  opts?: Omit<ApiErrorOptions, "status">,
): NextResponse {
  const body: Record<string, unknown> = { error: message };
  if (opts?.errorCode) body.errorCode = opts.errorCode;
  if (opts?.details) body.details = opts.details;
  return NextResponse.json(body, { status });
}

/**
 * Extract a message from an unknown caught error and return an apiError.
 *
 * @param error - the caught error (narrowed via instanceof)
 * @param fallback - fallback message when error is not an Error instance
 * @param status - HTTP status code (defaults to 500)
 * @returns a NextResponse with the error envelope
 */
export function apiErrorFromCatch(
  error: unknown,
  fallback = "Internal server error",
  status = 500,
): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  return apiError(message, status);
}
