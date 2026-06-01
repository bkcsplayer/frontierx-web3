import "server-only";

import type { Address, Hash } from "viem";

type BurnReservation = {
  requestHash: Hash;
  walletAddress: Address;
  status: "pending" | "consumed";
  expiresAt: number;
};

const consumedBurns = new Map<string, BurnReservation>();
const consumedNonces = new Map<string, number>();
const PENDING_TTL_MS = 2 * 60 * 1_000;
const CONSUMED_TTL_MS = 24 * 60 * 60 * 1_000;

export function claimNonceOnce({
  chainId,
  walletAddress,
  nonce,
  expiresAt,
}: {
  chainId: number;
  walletAddress: Address;
  nonce: string;
  expiresAt: number;
}) {
  cleanupExpired();

  const key = `${chainId}:${walletAddress}:${nonce}`;
  if (consumedNonces.has(key)) {
    return { ok: false as const, error: "Nonce has already been used" };
  }

  consumedNonces.set(key, expiresAt);
  return { ok: true as const };
}

export function reserveBurnOnce({
  chainId,
  txHash,
  walletAddress,
  requestHash,
}: {
  chainId: number;
  txHash: Hash;
  walletAddress: Address;
  requestHash: Hash;
}) {
  if (requiresDurableStore()) {
    return {
      ok: false as const,
      error: "Durable burn consumption storage is required in production",
    };
  }

  cleanupExpired();

  const key = burnKey(chainId, txHash);
  const existing = consumedBurns.get(key);

  if (existing) {
    return {
      ok: false as const,
      error:
        existing.requestHash === requestHash
          ? "Burn transaction is already being processed"
          : "Burn transaction has already been consumed",
    };
  }

  consumedBurns.set(key, {
    requestHash,
    walletAddress,
    status: "pending",
    expiresAt: Date.now() + PENDING_TTL_MS,
  });

  return { ok: true as const, key };
}

export function canAcceptBurnConsumption() {
  return !requiresDurableStore();
}

function requiresDurableStore() {
  return process.env.NODE_ENV === "production" && process.env.ALLOW_IN_MEMORY_BURN_GUARD !== "true";
}

export function markBurnConsumed(key: string) {
  const reservation = consumedBurns.get(key);
  if (!reservation) return;

  consumedBurns.set(key, {
    ...reservation,
    status: "consumed",
    expiresAt: Date.now() + CONSUMED_TTL_MS,
  });
}

export function releaseBurnReservation(key: string) {
  const reservation = consumedBurns.get(key);
  if (reservation?.status === "pending") {
    consumedBurns.delete(key);
  }
}

function burnKey(chainId: number, txHash: Hash) {
  return `${chainId}:${txHash}`;
}

function cleanupExpired() {
  const now = Date.now();

  for (const [key, reservation] of consumedBurns) {
    if (reservation.expiresAt <= now) {
      consumedBurns.delete(key);
    }
  }

  for (const [key, expiresAt] of consumedNonces) {
    if (expiresAt <= now) {
      consumedNonces.delete(key);
    }
  }
}
