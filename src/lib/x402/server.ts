import {
  FacilitatorResponseError,
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server";
import { x402HTTPResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { NextRequest, NextResponse } from "next/server";

const FACILITATOR_URL =
  process.env.FACILITATOR_URL ?? "https://facilitator.x402.org";

export const X402_PAY_TO = process.env.X402_PAY_TO ?? "";
export const X402_NETWORK = process.env.X402_NETWORK ?? "base-sepolia";

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

export const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(resourceServer);

/**
 * Next.js adapter for x402HTTPResourceServer.
 * Extracts headers, path, and method from NextRequest.
 */
class NextAdapter {
  /**
   *
   * @param req
   */
  constructor(private req: NextRequest) {}
  /**
   *
   * @param name
   */
  getHeader(name: string): string | undefined {
    return this.req.headers.get(name) || undefined;
  }
  /**
   *
   */
  getMethod(): string {
    return this.req.method;
  }
  /**
   *
   */
  getPath(): string {
    return this.req.nextUrl.pathname;
  }
  /**
   *
   */
  getUrl(): string {
    return this.req.url;
  }
  /**
   *
   */
  getAcceptHeader(): string {
    return this.req.headers.get("Accept") || "";
  }
  /**
   *
   */
  getUserAgent(): string {
    return this.req.headers.get("User-Agent") || "";
  }
  /**
   *
   */
  getQueryParams(): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    this.req.nextUrl.searchParams.forEach((value, key) => {
      const existing = params[key];
      if (existing) {
        if (Array.isArray(existing)) existing.push(value);
        else params[key] = [existing, value];
      } else {
        params[key] = value;
      }
    });
    return params;
  }
  /**
   *
   * @param name
   */
  getQueryParam(name: string): string | string[] | undefined {
    const all = this.req.nextUrl.searchParams.getAll(name);
    if (all.length === 0) return undefined;
    if (all.length === 1) return all[0];
    return all;
  }
  /**
   *
   */
  async getBody(): Promise<unknown> {
    try {
      return await this.req.json();
    } catch {
      return undefined;
    }
  }
}

/**
 *
 */
interface RouteConfig {
  accepts: {
    scheme: string;
    price: string;
    network: `${string}:${string}`;
    payTo: string;
  }[];
  description?: string;
  mimeType?: string;
}

/**
 * Thin withX402 wrapper for Next.js 15 (the official @x402/next requires Next 16).
 * Same behavior: returns 402 if no payment, runs handler after verification,
 * settles payment after a successful response.
 * @param routeHandler
 * @param routeConfig
 * @param server
 */
export function withX402(
  routeHandler: (req: NextRequest) => Promise<NextResponse>,
  routeConfig: RouteConfig,
  server: x402ResourceServer,
): (req: NextRequest) => Promise<NextResponse> {
  const routes = { "*": routeConfig };
  const httpServer = new x402HTTPResourceServer(server, routes);
  let initPromise: Promise<void> | null = httpServer.initialize();
  let isInitialized = false;

  return async (request: NextRequest): Promise<NextResponse> => {
    // Lazy initialization of facilitator sync
    if (!isInitialized) {
      if (!initPromise) initPromise = httpServer.initialize();
      try {
        await initPromise;
        isInitialized = true;
      } catch (error) {
        initPromise = null;
        const message =
          error instanceof Error ? error.message : "Payment facilitator unavailable";
        const status = error instanceof FacilitatorResponseError ? 502 : 503;
        return NextResponse.json({ error: message }, { status });
      }
    }

    const adapter = new NextAdapter(request);
    const context = {
      adapter,
      path: request.nextUrl.pathname,
      method: request.method,
      paymentHeader:
        adapter.getHeader("payment-signature") ||
        adapter.getHeader("x-payment"),
    };

    const result = await httpServer.processHTTPRequest(context);

    switch (result.type) {
      case "no-payment-required":
        return routeHandler(request);

      case "payment-error": {
        const { response } = result;
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/json");
        return new NextResponse(JSON.stringify(response.body ?? {}), {
          status: response.status,
          headers,
        });
      }

      case "payment-verified": {
        const {
          paymentPayload,
          paymentRequirements,
          declaredExtensions,
        } = result;
        const handlerResponse = await routeHandler(request);

        // Only settle if the handler succeeded
        if (handlerResponse.status >= 400) return handlerResponse;

        try {
          const responseBody = Buffer.from(
            await handlerResponse.clone().arrayBuffer(),
          );
          const settleResult = await httpServer.processSettlement(
            paymentPayload,
            paymentRequirements,
            declaredExtensions,
            { request: context, responseBody },
          );

          if (!settleResult.success) {
            const sr = settleResult.response;
            return new NextResponse(JSON.stringify(sr.body ?? {}), {
              status: sr.status,
              headers: sr.headers,
            });
          }

          Object.entries(settleResult.headers).forEach(([key, value]) => {
            handlerResponse.headers.set(key, value);
          });
          return handlerResponse;
        } catch (error) {
          if (error instanceof FacilitatorResponseError) {
            return NextResponse.json(
              { error: error.message },
              { status: 502 },
            );
          }
          const { logger } = await import("@/lib/logger");
          logger.error("x402 settlement failed", {
            error: error instanceof Error ? error.message : "unknown",
          });
          return NextResponse.json({}, { status: 402 });
        }
      }
    }
  };
}
