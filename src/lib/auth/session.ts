/**
 * Server-side session management using iron-session.
 *
 * After World ID verification, a signed HTTP-only cookie is set containing
 * the user's profileId and userId. All protected API routes validate this
 * session before processing requests.
 */

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/** Data stored in the encrypted session cookie */
export interface SessionData {
  userId: string;
  profileId: string;
  worldIdHash: string;
}

const SESSION_OPTIONS: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "dev-secret-must-be-at-least-32-characters-long!!",
  cookieName: "vm_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

/**
 * Get the current session from the cookie jar (server components / route handlers).
 *
 * @returns the session data with a destroy helper
 */
export async function getSession(): Promise<
  SessionData & { destroy: () => void }
> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

/**
 * Set session data after successful verification.
 *
 * @param data - the session fields to persist
 * @returns the saved session object
 */
export async function createSession(
  data: SessionData,
): Promise<SessionData & { destroy: () => void }> {
  const session = await getSession();
  session.userId = data.userId;
  session.profileId = data.profileId;
  session.worldIdHash = data.worldIdHash;
  await (session as unknown as { save: () => Promise<void> }).save();
  return session;
}

/** Destroy the current session */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * Require a valid session on a route handler. Returns the session data
 * or a 401 NextResponse if unauthenticated.
 *
 * @param _req - optional incoming request (reserved for future middleware use)
 * @returns session data or a 401 NextResponse
 */
export async function requireSession(
  _req?: NextRequest,
): Promise<SessionData | NextResponse> {
  const session = await getSession();

  if (!session.userId || !session.profileId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  return {
    userId: session.userId,
    profileId: session.profileId,
    worldIdHash: session.worldIdHash,
  };
}

/**
 * Type guard: checks whether requireSession returned session data vs an error response.
 *
 * @param result - the return value from requireSession
 * @returns true if the result is valid SessionData
 */
export function isSession(
  result: SessionData | NextResponse,
): result is SessionData {
  return !(result instanceof NextResponse);
}
