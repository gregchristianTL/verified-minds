/**
 * Next.js Instrumentation -- validates environment variables at startup.
 *
 * In production, missing required variables throw immediately to prevent
 * a broken deploy. In development, they emit warnings.
 */

import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  NEXT_PUBLIC_WORLD_APP_ID: z.string().min(1, "NEXT_PUBLIC_WORLD_APP_ID is required"),
  NEXT_PUBLIC_WORLD_ACTION: z.string().default("verify-expertise"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Neon connection string").optional(),
  X402_PAY_TO: z.string().optional(),
  X402_NETWORK: z.string().default("base-sepolia"),
  FACILITATOR_URL: z.string().url().optional(),
  XMTP_PRIVATE_KEY: z.string().optional(),
  ADIN_API_KEY: z.string().optional(),
});

/** Validate environment variables at application startup (Node.js only) */
export async function register(): Promise<void> {
  if (typeof (globalThis as Record<string, unknown>).EdgeRuntime !== "undefined") return;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    const message = `Environment validation failed:\n${issues}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }

    console.warn(`[env] ${message}`);
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.SESSION_SECRET
  ) {
    throw new Error(
      "SESSION_SECRET is required in production (at least 32 characters)",
    );
  }
}
