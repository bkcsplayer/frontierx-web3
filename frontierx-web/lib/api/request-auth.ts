import "server-only";

import {
  getAddress,
  isAddress,
  isHash,
  isHex,
  keccak256,
  recoverMessageAddress,
  toBytes,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { buildAIRequestMessage, hashPayload } from "@/lib/api/ai-request-message";

export type SignedAIAgentBody = {
  txHash: Hash;
  chainId: number;
  walletAddress: Address;
  payload: unknown;
  nonce: string;
  expiresAt: number;
  signature: Hex;
};

const MAX_SIGNATURE_TTL_MS = 10 * 60 * 1_000;

export async function validateSignedAgentBody(
  body: unknown,
  route: string,
): Promise<
  | { ok: true; body: SignedAIAgentBody; payloadHash: Hash; requestHash: Hash }
  | { ok: false; error: string }
> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const txHash = body.txHash;
  const chainId = body.chainId;
  const walletAddress = body.walletAddress;
  const nonce = body.nonce;
  const expiresAt = body.expiresAt;
  const signature = body.signature;

  if (typeof txHash !== "string" || !isHash(txHash)) {
    return { ok: false, error: "Invalid txHash" };
  }

  if (typeof chainId !== "number" || !Number.isInteger(chainId)) {
    return { ok: false, error: "Invalid chainId" };
  }

  if (typeof walletAddress !== "string" || !isAddress(walletAddress)) {
    return { ok: false, error: "Invalid walletAddress" };
  }

  if (typeof nonce !== "string" || nonce.length < 12 || nonce.length > 128) {
    return { ok: false, error: "Invalid nonce" };
  }

  if (typeof expiresAt !== "number" || !Number.isInteger(expiresAt)) {
    return { ok: false, error: "Invalid expiresAt" };
  }

  const now = Date.now();
  if (expiresAt <= now || expiresAt > now + MAX_SIGNATURE_TTL_MS) {
    return { ok: false, error: "Signature is expired or too far in the future" };
  }

  if (typeof signature !== "string" || !isHex(signature) || !isWalletSignatureHex(signature)) {
    return { ok: false, error: "Invalid signature" };
  }

  const normalizedWallet = getAddress(walletAddress);
  const payloadHash = hashPayload(body.payload);
  const message = buildAIRequestMessage({
    route,
    chainId,
    txHash,
    walletAddress: normalizedWallet,
    payloadHash,
    nonce,
    expiresAt,
  });
  let recovered: Address;
  try {
    recovered = await recoverMessageAddress({ message, signature });
  } catch {
    return { ok: false, error: "Invalid wallet signature" };
  }

  if (getAddress(recovered) !== normalizedWallet) {
    return { ok: false, error: "Invalid wallet signature" };
  }

  return {
    ok: true,
    body: {
      txHash,
      chainId,
      walletAddress: normalizedWallet,
      payload: body.payload,
      nonce,
      expiresAt,
      signature,
    },
    payloadHash,
    requestHash: keccak256(toBytes(message)),
  };
}

function isWalletSignatureHex(signature: Hex) {
  return signature.length === 132;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
