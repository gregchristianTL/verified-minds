/**
 * Unwrap the standard API response envelope.
 *
 * API routes return `{ data: T }` for success responses.
 * This helper safely extracts the inner payload, and is a no-op
 * if the response is already unwrapped (backward-compatible).
 *
 * @param json - the parsed JSON response (wrapped or unwrapped)
 * @returns the inner data payload
 */
export function unwrap<T>(json: { data: T } | T): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}
