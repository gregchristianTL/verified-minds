/**
 * World ID Verification
 *
 * Verifies proofs server-side against the World ID API.
 * Works for both MiniKit (in-app) and IDKit (browser widget) flows.
 * In development, demo proofs (merkle_root === "demo") bypass the API.
 */

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "";
const WORLD_ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION ?? "verify-expertise";
const IS_DEV = process.env.NODE_ENV === "development";

export interface WorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
}

export async function verifyWorldIdProof(
  proof: WorldIdProof,
): Promise<{ verified: boolean; nullifierHash: string }> {
  // Dev bypass: demo proofs skip the real World API
  if (IS_DEV && proof.merkle_root === "demo") {
    return { verified: true, nullifierHash: proof.nullifier_hash };
  }

  const res = await fetch(
    `https://developer.worldcoin.org/api/v1/verify/${WORLD_APP_ID}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        proof: proof.proof,
        action: WORLD_ACTION,
      }),
    },
  );

  if (!res.ok) {
    return { verified: false, nullifierHash: proof.nullifier_hash };
  }

  return { verified: true, nullifierHash: proof.nullifier_hash };
}
