import { zeroAddress, type Address } from "viem";

export type PendingForgeState = {
  player: Address;
  paid: bigint;
  requestBlock: bigint;
  settled: boolean;
};

export function parsePendingForge(data: unknown): PendingForgeState | undefined {
  if (!data) return undefined;

  if (Array.isArray(data)) {
    const [player, paid, requestBlock, settled] = data;
    if (typeof player !== "string") return undefined;
    return {
      player: player as Address,
      paid: BigInt(paid ?? 0),
      requestBlock: BigInt(requestBlock ?? 0),
      settled: Boolean(settled),
    };
  }

  if (typeof data === "object" && data !== null && "player" in data) {
    const row = data as PendingForgeState;
    return {
      player: row.player,
      paid: BigInt(row.paid ?? 0),
      requestBlock: BigInt(row.requestBlock ?? 0),
      settled: Boolean(row.settled),
    };
  }

  return undefined;
}

export function isZeroPlayer(player: Address | undefined) {
  return !player || player === zeroAddress;
}
