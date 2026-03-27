/**
 * XMTP Earnings Notifications
 *
 * Sends real-time notifications to experts when their agent earns money.
 * Uses XMTP messaging protocol — messages arrive in the expert's wallet-connected inbox.
 */

// NOTE: @xmtp/xmtp-js is deprecated but functional for the hackathon.
// Production would use @xmtp/mls-client or @xmtp/browser-sdk.

interface NotificationParams {
  walletAddress: string;
  amount: number;
  querySummary: string;
  domainTag: string | null;
}

export async function sendEarningsNotification(
  params: NotificationParams,
): Promise<boolean> {
  const privateKey = process.env.XMTP_PRIVATE_KEY;

  if (!privateKey || !params.walletAddress) {
    return false;
  }

  try {
    // Dynamic import to avoid loading XMTP in every request
    const { Client } = await import("@xmtp/xmtp-js");
    const { Wallet } = await import("ethers");

    const signer = new Wallet(privateKey);
    const client = await Client.create(signer, { env: "production" });

    const canMessage = await client.canMessage(params.walletAddress);
    if (!canMessage) {
      return false;
    }

    const conversation = await client.conversations.newConversation(
      params.walletAddress,
    );

    const message = [
      `💰 +$${params.amount.toFixed(2)} earned`,
      params.domainTag ? `Domain: ${params.domainTag}` : null,
      `Query: "${params.querySummary}"`,
      "",
      "Your expert agent just got paid. Keep earning while you sleep.",
    ]
      .filter(Boolean)
      .join("\n");

    await conversation.send(message);
    return true;
  } catch (error) {
    console.error("[XMTP] Notification failed:", error);
    return false;
  }
}
