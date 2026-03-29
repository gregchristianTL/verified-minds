/**
 * Exa API client for swarm agents (web search + URL contents).
 * Ported from adin-swarm -- uses plain fetch, no Next.js-specific helpers.
 *
 * @see https://docs.exa.ai/reference/search
 */

const EXA_API_URL = "https://api.exa.ai";
const REQUEST_TIMEOUT_MS = 15_000;

function getExaApiKey(): string | undefined {
  const k = process.env.EXA_API_KEY?.trim();
  return k || undefined;
}

/** True when EXA_API_KEY is set (enables web_search / fetch_url tools). */
export function isExaConfigured(): boolean {
  return Boolean(getExaApiKey());
}

export interface ExaSearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface ExaSearchOptions {
  maxResults?: number;
  type?: "neural" | "keyword" | "auto";
}

/**
 * Neural / hybrid search via Exa.
 *
 * @param query - the search query string
 * @param options - optional search configuration
 * @returns search results array
 */
export async function exaSearch(
  query: string,
  options: ExaSearchOptions = {},
): Promise<{ results: ExaSearchResult[] }> {
  const apiKey = getExaApiKey();
  if (!apiKey) {
    throw new Error("EXA_API_KEY environment variable is not set");
  }

  const { maxResults = 8, type = "auto" } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      query,
      numResults: maxResults,
      type,
      contents: { text: true, extras: { imageLinks: 1 } },
    };

    const response = await fetch(`${EXA_API_URL}/search`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let msg = `Exa API error ${response.status}`;
      try {
        const err = (await response.json()) as {
          error?: string;
          message?: string;
        };
        msg = err.error || err.message || msg;
      } catch {
        /* ignore parse errors */
      }
      throw new Error(msg);
    }

    interface RawR {
      url: string;
      title?: string;
      text?: string;
      highlights?: string[];
      score?: number;
      publishedDate?: string;
    }
    interface RawResp {
      results: RawR[];
    }

    const raw = (await response.json()) as RawResp;
    const results: ExaSearchResult[] = raw.results.map((r) => ({
      url: r.url,
      title: r.title || "",
      content: r.text || r.highlights?.join(" ") || "",
      score: r.score || 0,
      publishedDate: r.publishedDate,
    }));

    return { results };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Exa API request timed out");
    }
    throw error;
  }
}

export interface ExaContentsOptions {
  maxCharacters?: number;
}

/**
 * Fetch cleaned text for specific URLs via Exa /contents.
 *
 * @param urls - array of HTTPS URLs to fetch
 * @param options - optional configuration (maxCharacters)
 * @returns array of url/title/text objects
 */
export async function exaGetContents(
  urls: string[],
  options: ExaContentsOptions = {},
): Promise<{ results: Array<{ url: string; title: string; text: string }> }> {
  const apiKey = getExaApiKey();
  if (!apiKey) {
    throw new Error("EXA_API_KEY environment variable is not set");
  }

  const { maxCharacters = 12_000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${EXA_API_URL}/contents`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls, text: { maxCharacters } }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let msg = `Exa contents error ${response.status}`;
      try {
        const err = (await response.json()) as {
          error?: string;
          message?: string;
        };
        msg = err.error || err.message || msg;
      } catch {
        /* ignore parse errors */
      }
      throw new Error(msg);
    }

    interface RawC {
      url: string;
      title?: string;
      text?: string;
    }
    interface RawContents {
      results: RawC[];
    }

    const raw = (await response.json()) as RawContents;
    const results = raw.results.map((r) => ({
      url: r.url,
      title: r.title || "",
      text: r.text || "",
    }));

    return { results };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Exa getContents request timed out");
    }
    throw error;
  }
}
