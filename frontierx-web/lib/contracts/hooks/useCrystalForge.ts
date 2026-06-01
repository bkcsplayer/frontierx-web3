"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, formatEther, getAddress, zeroAddress } from "viem";
import {
  useAccount,
  useBlockNumber,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { crystalForgeAbi } from "@/lib/contracts/abis/crystalForge";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { refetchAllSettled, voidRefetch } from "@/lib/utils/query";
import { useFRXToken } from "@/lib/contracts/hooks/useFRXToken";

export const forgeResultLabels = ["SHATTER", "GLOW", "BLAZE", "SUPERNOVA"] as const;

export type ForgeHistoryRecord = {
  player: `0x${string}`;
  result: 0 | 1 | 2 | 3;
  payout: bigint;
  timestamp: bigint;
};

export function useCrystalForge() {
  const { address } = useAccount();
  const { chain, chainId, hasCrystalForge, hasFRXToken, isSupportedChain } = useChainConfig();
  const crystalForgeAddress = chain?.contracts.crystalForge ?? zeroAddress;
  const isConfigured = isSupportedChain && hasFRXToken && hasCrystalForge;
  const canRead = isConfigured;
  const [txChainId, setTxChainId] = useState<number | undefined>(undefined);
  const refetchedHash = useRef<string | undefined>(undefined);

  const playCostQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "PLAY_COST",
    query: { enabled: canRead },
  });
  const playCost = playCostQuery.data ?? BigInt(0);
  const frx = useFRXToken(crystalForgeAddress, playCost ? formatEther(playCost) : "0");
  const { refetchAllowance, refetchBalance } = frx;

  const blockNumberQuery = useBlockNumber({
    chainId,
    query: {
      enabled: canRead,
      refetchInterval: 10_000,
    },
  });

  const totalPlaysQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "totalPlays",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const totalBurnedQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "totalBurned",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const totalPaidOutQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "totalPaidOut",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const nextRequestIdQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "nextRequestId",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const playerPlaysQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "playerPlays",
    args: [address ?? zeroAddress],
    query: { enabled: canRead && Boolean(address), refetchInterval: 10_000 },
  });

  const playerWinningsQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "playerWinnings",
    args: [address ?? zeroAddress],
    query: { enabled: canRead && Boolean(address), refetchInterval: 10_000 },
  });

  const historyQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "getRecentHistory",
    args: [BigInt(5)],
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const { writeContract, data: txHash, error: writeError, isPending: isWritePending } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    chainId: txChainId,
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const trackedRequestId = useMemo(() => {
    if (!receipt) return undefined;

    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: crystalForgeAbi,
          data: log.data,
          topics: log.topics,
        });

        if (event.eventName === "ForgeRequested") {
          return event.args.requestId;
        }
      } catch {
        // Ignore unrelated logs in the receipt.
      }
    }

    return undefined;
  }, [receipt]);

  const pendingForgeQuery = useReadContract({
    address: crystalForgeAddress,
    abi: crystalForgeAbi,
    functionName: "pendingForges",
    args: [trackedRequestId ?? BigInt(0)],
    query: {
      enabled: canRead && Boolean(trackedRequestId),
      refetchInterval: 10_000,
    },
  });

  useEffect(() => {
    if (!isConfirmed || !txHash || txChainId !== chainId || refetchedHash.current === txHash) return;

    refetchedHash.current = txHash;
    void refetchAllSettled(
      () => totalPlaysQuery.refetch(),
      () => totalBurnedQuery.refetch(),
      () => totalPaidOutQuery.refetch(),
      () => nextRequestIdQuery.refetch(),
      () => playerPlaysQuery.refetch(),
      () => playerWinningsQuery.refetch(),
      () => pendingForgeQuery.refetch(),
      () => historyQuery.refetch(),
      () => refetchAllowance(),
      () => refetchBalance(),
    );
  }, [
    chainId,
    historyQuery,
    isConfirmed,
    nextRequestIdQuery,
    pendingForgeQuery,
    playerPlaysQuery,
    playerWinningsQuery,
    refetchAllowance,
    refetchBalance,
    totalBurnedQuery,
    totalPaidOutQuery,
    totalPlaysQuery,
    txChainId,
    txHash,
  ]);

  useEffect(() => {
    if (!frx.isApprovalConfirmed) return;
    voidRefetch(refetchAllowance);
  }, [frx.isApprovalConfirmed, refetchAllowance]);

  const pendingForge = pendingForgeQuery.data;
  const pendingPlayer = pendingForge?.[0] ?? zeroAddress;
  const isOwnPendingRequest =
    Boolean(address) && pendingPlayer !== zeroAddress && getAddress(pendingPlayer) === getAddress(address ?? zeroAddress);
  const pendingPaid = pendingForge?.[1] ?? BigInt(0);
  const pendingRequestBlock = pendingForge?.[2] ?? BigInt(0);
  const pendingSettled = pendingForge?.[3] ?? false;
  const currentBlock = blockNumberQuery.data ?? BigInt(0);
  const canSettle =
    Boolean(trackedRequestId) &&
    isOwnPendingRequest &&
    pendingPlayer !== zeroAddress &&
    !pendingSettled &&
    currentBlock > pendingRequestBlock &&
    currentBlock <= pendingRequestBlock + BigInt(256);
  const canRefund =
    Boolean(trackedRequestId) &&
    isOwnPendingRequest &&
    pendingPlayer !== zeroAddress &&
    !pendingSettled &&
    currentBlock > pendingRequestBlock + BigInt(256);

  const readError =
    playCostQuery.error ??
    totalPlaysQuery.error ??
    totalBurnedQuery.error ??
    totalPaidOutQuery.error ??
    nextRequestIdQuery.error ??
    playerPlaysQuery.error ??
    playerWinningsQuery.error ??
    pendingForgeQuery.error ??
    historyQuery.error ??
    blockNumberQuery.error ??
    frx.readError;
  const txError = writeError ?? receiptError ?? frx.approvalError;
  const isLoading =
    playCostQuery.isLoading ||
    totalPlaysQuery.isLoading ||
    totalBurnedQuery.isLoading ||
    totalPaidOutQuery.isLoading ||
    nextRequestIdQuery.isLoading ||
    playerPlaysQuery.isLoading ||
    playerWinningsQuery.isLoading ||
    pendingForgeQuery.isLoading ||
    historyQuery.isLoading ||
    frx.isLoading;

  const history = useMemo(
    () => Array.from((historyQuery.data ?? []) as readonly ForgeHistoryRecord[]).reverse(),
    [historyQuery.data],
  );

  const ensureReady = () => {
    if (!isConfigured) {
      throw new Error("FRX token and CrystalForge addresses must be configured for this chain.");
    }

    if (readError) {
      throw new Error("Crystal Forge state could not be read. Please retry before sending a transaction.");
    }

    if (isLoading || playCost <= BigInt(0)) {
      throw new Error("Crystal Forge cost and allowance are still loading. Please wait.");
    }
  };

  const approveForge = () => {
    ensureReady();
    frx.approve(playCost);
  };

  const requestForge = () => {
    ensureReady();
    setTxChainId(chainId);
    writeContract({
      address: crystalForgeAddress,
      abi: crystalForgeAbi,
      functionName: "forge",
    });
  };

  const settleForge = () => {
    ensureReady();

    if (!trackedRequestId) {
      throw new Error("No tracked forge request to settle.");
    }

    setTxChainId(chainId);
    writeContract({
      address: crystalForgeAddress,
      abi: crystalForgeAbi,
      functionName: "settleForge",
      args: [trackedRequestId],
    });
  };

  const refundExpiredForge = () => {
    ensureReady();

    if (!trackedRequestId) {
      throw new Error("No tracked forge request to refund.");
    }

    setTxChainId(chainId);
    writeContract({
      address: crystalForgeAddress,
      abi: crystalForgeAbi,
      functionName: "refundExpiredForge",
      args: [trackedRequestId],
    });
  };

  return {
    chain,
    crystalForgeAddress,
    isConnected: Boolean(address),
    isConfigured,
    isReady: isConfigured && playCost > BigInt(0) && !isLoading && !readError,
    playCost,
    playCostFormatted: formatEther(playCost),
    frxBalanceFormatted: frx.balanceFormatted,
    hasForgeAllowance: frx.hasAllowance,
    isApproving: frx.isApproving,
    isApprovalConfirmed: frx.isApprovalConfirmed,
    totalPlays: totalPlaysQuery.data ?? BigInt(0),
    totalBurned: totalBurnedQuery.data ?? BigInt(0),
    totalBurnedFormatted: formatEther(totalBurnedQuery.data ?? BigInt(0)),
    totalPaidOut: totalPaidOutQuery.data ?? BigInt(0),
    totalPaidOutFormatted: formatEther(totalPaidOutQuery.data ?? BigInt(0)),
    playerPlays: playerPlaysQuery.data ?? BigInt(0),
    playerWinnings: playerWinningsQuery.data ?? BigInt(0),
    playerWinningsFormatted: formatEther(playerWinningsQuery.data ?? BigInt(0)),
    trackedRequestId,
    isOwnPendingRequest,
    pendingPaid,
    pendingPaidFormatted: formatEther(pendingPaid),
    pendingRequestBlock,
    pendingSettled,
    currentBlock,
    canSettle,
    canRefund,
    history,
    isLoading,
    isTransacting: isWritePending || isConfirming,
    isConfirmed,
    readError,
    txError,
    approveForge,
    requestForge,
    settleForge,
    refundExpiredForge,
  };
}
