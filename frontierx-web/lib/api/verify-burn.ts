import "server-only";

import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  parseAbiItem,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import { base, hardhat, polygon, sepolia } from "viem/chains";

export type BurnVerification = {
  valid: boolean;
  burner: Address;
  amount: bigint;
  error?: string;
};

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const tokensBurnedEvent = parseAbiItem("event TokensBurned(address indexed from, uint256 amount)");

export async function verifyBurn({
  txHash,
  chainId,
  expectedBurner,
  minimumAmount,
}: {
  txHash: Hash;
  chainId: number;
  expectedBurner: Address;
  minimumAmount: bigint;
}): Promise<BurnVerification> {
  const client = getPublicClient(chainId);
  const frxAddress = getFRXAddress(chainId);

  if (!client) {
    return invalidBurn("Unsupported chain");
  }

  if (!frxAddress || frxAddress === zeroAddress) {
    return invalidBurn("FRX token address is not configured");
  }

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      return invalidBurn("Burn transaction failed");
    }

    const expected = getAddress(expectedBurner);

    for (const log of receipt.logs) {
      if (getAddress(log.address) !== frxAddress) continue;

      const transferBurn = decodeTransferBurn(log, expected, minimumAmount);
      if (transferBurn.valid) return transferBurn;

      const customBurn = decodeTokensBurned(log, expected, minimumAmount);
      if (customBurn.valid) return customBurn;
    }

    return invalidBurn("Required FRX burn event not found");
  } catch {
    return invalidBurn("Burn verification failed");
  }
}

function getPublicClient(chainId: number) {
  if (chainId === hardhat.id) {
    return createPublicClient({
      chain: hardhat,
      transport: http(process.env.LOCAL_RPC_URL || process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:9831"),
    });
  }

  if (chainId === sepolia.id) {
    return createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    });
  }

  if (chainId === polygon.id) {
    return createPublicClient({
      chain: polygon,
      transport: http(process.env.POLYGON_RPC_URL || process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    });
  }

  if (chainId === base.id) {
    return createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL),
    });
  }

  return undefined;
}

function getFRXAddress(chainId: number) {
  const valueByChain: Record<number, string | undefined> = {
    [hardhat.id]: process.env.NEXT_PUBLIC_LOCAL_FRX_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_LOCAL_FRX_TOKEN,
    [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_FRX_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_SEPOLIA_FRX_TOKEN,
    [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_FRX_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_POLYGON_FRX_TOKEN,
    [base.id]: process.env.NEXT_PUBLIC_BASE_FRX_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_BASE_FRX_TOKEN,
  };
  const value = valueByChain[chainId];

  return value && isAddress(value) ? getAddress(value) : undefined;
}

function decodeTransferBurn(
  log: { data: Hash; topics: readonly Hash[] },
  expectedBurner: Address,
  minimumAmount: bigint,
): BurnVerification {
  try {
    const event = decodeEventLog({
      abi: [transferEvent],
      data: log.data,
      topics: [...log.topics] as [Hash, ...Hash[]],
    });

    if (event.eventName !== "Transfer") return invalidBurn("Not a Transfer event");

    const from = getAddress(event.args.from);
    const to = getAddress(event.args.to);
    const amount = event.args.value;

    if (from === expectedBurner && to === zeroAddress && amount >= minimumAmount) {
      return { valid: true, burner: from, amount };
    }
  } catch {
    // Ignore non-matching logs.
  }

  return invalidBurn("Transfer burn conditions not met");
}

function decodeTokensBurned(
  log: { data: Hash; topics: readonly Hash[] },
  expectedBurner: Address,
  minimumAmount: bigint,
): BurnVerification {
  try {
    const event = decodeEventLog({
      abi: [tokensBurnedEvent],
      data: log.data,
      topics: [...log.topics] as [Hash, ...Hash[]],
    });

    if (event.eventName !== "TokensBurned") return invalidBurn("Not a TokensBurned event");

    const burner = getAddress(event.args.from);
    const amount = event.args.amount;

    if (burner === expectedBurner && amount >= minimumAmount) {
      return { valid: true, burner, amount };
    }
  } catch {
    // Ignore non-matching logs.
  }

  return invalidBurn("TokensBurned conditions not met");
}

function invalidBurn(error: string): BurnVerification {
  return {
    valid: false,
    burner: zeroAddress,
    amount: BigInt(0),
    error,
  };
}
