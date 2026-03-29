/**
 * SSRF-safe fetch wrapper.
 *
 * Validates URLs before fetching to block requests to private IP ranges,
 * localhost, link-local addresses, and cloud metadata endpoints.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

/** CIDR-style private/reserved IP prefixes to block */
const BLOCKED_IP_PREFIXES = [
  "127.",      // loopback
  "10.",       // RFC 1918
  "172.16.",   // RFC 1918 (172.16.0.0/12)
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",  // RFC 1918
  "169.254.",  // link-local / AWS metadata
  "0.",        // "this" network
  "0:0:0:0:0:0:0:1", // IPv6 loopback
  "::1",       // IPv6 loopback
  "fc",        // IPv6 unique local
  "fd",        // IPv6 unique local
  "fe80:",     // IPv6 link-local
];

/**
 * Checks whether a hostname is a known-blocked hostname or private IP.
 *
 * @param hostname - the hostname to check against blocklists
 * @returns true if the hostname should be blocked
 */
function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower)) return true;

  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  return false;
}

/** Error thrown when a URL fails SSRF validation */
export class SSRFError extends Error {
  /**
   * @param message - description of why the URL was blocked
   */
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

/**
 * Validate a URL for safety before fetching. Throws SSRFError if the URL
 * targets a private/reserved network or blocked hostname.
 *
 * @param rawUrl - the URL string to validate
 * @returns the parsed URL object
 */
export function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFError("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new SSRFError(`Blocked protocol: ${parsed.protocol}`);
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new SSRFError(`Blocked host: ${parsed.hostname}`);
  }

  return parsed;
}

/**
 * Fetch a URL with SSRF protections applied.
 * Validates the URL before making the request.
 *
 * @param rawUrl - the URL string to fetch
 * @param init - optional RequestInit options forwarded to fetch
 * @returns the fetch Response
 */
export async function safeFetch(
  rawUrl: string,
  init?: RequestInit,
): Promise<Response> {
  validateUrl(rawUrl);

  return fetch(rawUrl, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
}
