import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Payment Middleware
 *
 * Validates x402 payment headers on expert query requests.
 * The x402 protocol embeds payment in HTTP headers:
 * - X-Payment: base64-encoded payment proof
 * - X-Payment-Amount: amount in USDC
 *
 * For the hackathon, this is a lightweight check.
 * In production, this would verify on-chain payment settlement.
 */

const X402_PAY_TO = process.env.X402_PAY_TO ?? "";
const X402_NETWORK = process.env.X402_NETWORK ?? "base-sepolia";

interface PaymentInfo {
  amount: number;
  payer: string;
  txHash: string | null;
}

export function extractPayment(req: NextRequest): PaymentInfo | null {
  const paymentHeader = req.headers.get("x-payment");
  const amountHeader = req.headers.get("x-payment-amount");

  if (!paymentHeader || !amountHeader) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8"),
    );

    return {
      amount: parseFloat(amountHeader),
      payer: decoded.payer ?? "unknown",
      txHash: decoded.txHash ?? null,
    };
  } catch {
    // Fallback: treat header as simple identifier
    return {
      amount: parseFloat(amountHeader) || 0,
      payer: paymentHeader,
      txHash: null,
    };
  }
}

export function requirePayment(
  req: NextRequest,
  minimumAmount: number,
): NextResponse | null {
  const payment = extractPayment(req);

  if (!payment) {
    return NextResponse.json(
      {
        error: "Payment required",
        statusCode: 402,
        payTo: X402_PAY_TO,
        network: X402_NETWORK,
        amount: minimumAmount,
        currency: "USDC",
      },
      { status: 402 },
    );
  }

  if (payment.amount < minimumAmount) {
    return NextResponse.json(
      {
        error: "Insufficient payment",
        required: minimumAmount,
        received: payment.amount,
        currency: "USDC",
      },
      { status: 402 },
    );
  }

  return null;
}

export { X402_PAY_TO, X402_NETWORK };
