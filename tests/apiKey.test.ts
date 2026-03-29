import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireApiKey } from "@/lib/auth/apiKey";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/chat", {
    method: "POST",
    headers,
  });
}

describe("requireApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it("returns null (pass) in development when no key is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ADIN_API_KEY;

    const result = requireApiKey(makeRequest());
    expect(result).toBeNull();
  });

  it("returns 503 in production when no key is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ADIN_API_KEY;

    const result = requireApiKey(makeRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(503);
  });

  it("returns 401 when Authorization header is missing", async () => {
    process.env.ADIN_API_KEY = "test-key-123";

    const result = requireApiKey(makeRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    process.env.ADIN_API_KEY = "test-key-123";

    const result = requireApiKey(
      makeRequest({ authorization: "Basic dXNlcjpwYXNz" }),
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 403 when API key is wrong", async () => {
    process.env.ADIN_API_KEY = "test-key-123";

    const result = requireApiKey(
      makeRequest({ authorization: "Bearer wrong-key" }),
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null (pass) when API key is correct", () => {
    process.env.ADIN_API_KEY = "test-key-123";

    const result = requireApiKey(
      makeRequest({ authorization: "Bearer test-key-123" }),
    );
    expect(result).toBeNull();
  });
});
