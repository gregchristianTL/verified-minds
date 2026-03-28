/**
 * Demo Agent — queries an expert via x402 and pays real USDC.
 *
 * Prerequisites:
 *   1. The app is running on localhost:3000
 *   2. At least one expert is live (check /marketplace)
 *   3. AGENT_PRIVATE_KEY is set (Base Sepolia wallet with testnet USDC + ETH)
 *
 * Usage:
 *   npx tsx scripts/demo-agent.ts <profileId> "Your question here"
 *
 * Testnet USDC (Base Sepolia): 0x036CbD53842c5426634e7929541eC2318f3dCF7e
 * Faucet: https://docs.base.org/docs/tools/network-faucets
 */

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("Set AGENT_PRIVATE_KEY (Base Sepolia wallet with testnet USDC)");
  process.exit(1);
}

const [, , profileId, question] = process.argv;

if (!profileId || !question) {
  console.error("Usage: npx tsx scripts/demo-agent.ts <profileId> \"Your question\"");
  process.exit(1);
}

const signer = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
console.log(`Agent wallet: ${signer.address}`);

const client = new x402Client();
registerExactEvmScheme(client, { signer });

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

async function main(): Promise<void> {
  console.log(`\nQuerying expert ${profileId}...`);
  console.log(`Question: "${question}"\n`);

  const res = await fetchWithPayment(`${API_BASE}/api/expertise/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, question }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Request failed (${res.status}):`, text);
    process.exit(1);
  }

  const data = await res.json();

  console.log("--- Expert Response ---");
  console.log(data.answer);
  console.log(`\nPayment: $${data.amount} USDC`);
  console.log(`Earning ID: ${data.earningId}`);
}

main().catch((err) => {
  console.error("Agent error:", err);
  process.exit(1);
});
