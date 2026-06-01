import { keccak256, toBytes, type Address, type Hash } from "viem";

export function buildAIRequestMessage({
  route,
  chainId,
  txHash,
  walletAddress,
  payloadHash,
  nonce,
  expiresAt,
}: {
  route: string;
  chainId: number;
  txHash: Hash;
  walletAddress: Address;
  payloadHash: Hash;
  nonce: string;
  expiresAt: number;
}) {
  return [
    "FrontierX AI request",
    `Route: ${route}`,
    `Chain ID: ${chainId}`,
    `Transaction: ${txHash}`,
    `Wallet: ${walletAddress}`,
    `Payload Hash: ${payloadHash}`,
    `Nonce: ${nonce}`,
    `Expires At: ${expiresAt}`,
  ].join("\n");
}

export function hashPayload(payload: unknown) {
  return keccak256(toBytes(stableStringify(payload)));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
