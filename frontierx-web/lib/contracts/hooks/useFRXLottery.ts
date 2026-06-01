"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEther, getAddress, parseEther, zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { frxLotteryAbi } from "@/lib/contracts/abis/frxLottery";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { refetchAllSettled, voidRefetch } from "@/lib/utils/query";
import { useFRXToken } from "@/lib/contracts/hooks/useFRXToken";

type LotteryEntry = {
  player: `0x${string}`;
  amount: bigint;
};

export function useFRXLottery(entryAmount = "10") {
  const { address } = useAccount();
  const { chain, chainId, hasFRXToken, hasLottery, isSupportedChain } = useChainConfig();
  const lotteryAddress = chain?.contracts.lottery ?? zeroAddress;
  const isConfigured = isSupportedChain && hasFRXToken && hasLottery;
  const canRead = isConfigured;
  const [txChainId, setTxChainId] = useState<number | undefined>(undefined);
  const refetchedHash = useRef<string | undefined>(undefined);
  const parsedEntryAmount = parseTokenAmount(entryAmount);
  const entryAmountWei = parsedEntryAmount ?? BigInt(0);

  const frx = useFRXToken(lotteryAddress, parsedEntryAmount ? entryAmount : "0");
  const { refetchAllowance, refetchBalance } = frx;

  const minEntryQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "MIN_ENTRY",
    query: { enabled: canRead },
  });

  const maxEntriesQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "MAX_ENTRIES_PER_ROUND",
    query: { enabled: canRead },
  });

  const currentRoundQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "currentRound",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const currentPoolQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "currentPool",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const timeUntilDrawQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "timeUntilDraw",
    query: { enabled: canRead, refetchInterval: 1_000 },
  });

  const entryCountQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "currentEntryCount",
    query: { enabled: canRead, refetchInterval: 10_000 },
  });

  const currentEntriesQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "getRoundEntries",
    args: [currentRoundQuery.data ?? BigInt(0)],
    query: {
      enabled: canRead && Boolean(currentRoundQuery.data),
      refetchInterval: 10_000,
    },
  });

  const previousRound = currentRoundQuery.data && currentRoundQuery.data > BigInt(1) ? currentRoundQuery.data - BigInt(1) : BigInt(0);

  const previousWinnerQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "roundWinner",
    args: [previousRound],
    query: { enabled: canRead && previousRound > BigInt(0) },
  });

  const previousPrizeQuery = useReadContract({
    address: lotteryAddress,
    abi: frxLotteryAbi,
    functionName: "roundPrize",
    args: [previousRound],
    query: { enabled: canRead && previousRound > BigInt(0) },
  });

  const { writeContract, data: txHash, error: writeError, isPending: isWritePending } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    chainId: txChainId,
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (!isConfirmed || !txHash || txChainId !== chainId || refetchedHash.current === txHash) return;

    refetchedHash.current = txHash;
    void refetchAllSettled(
      () => currentRoundQuery.refetch(),
      () => currentPoolQuery.refetch(),
      () => timeUntilDrawQuery.refetch(),
      () => entryCountQuery.refetch(),
      () => currentEntriesQuery.refetch(),
      () => refetchAllowance(),
      () => refetchBalance(),
    );
  }, [chainId, currentEntriesQuery, currentPoolQuery, currentRoundQuery, entryCountQuery, isConfirmed, refetchAllowance, refetchBalance, timeUntilDrawQuery, txChainId, txHash]);

  useEffect(() => {
    if (!frx.isApprovalConfirmed) return;
    voidRefetch(refetchAllowance);
  }, [frx.isApprovalConfirmed, refetchAllowance]);

  const entries = Array.from((currentEntriesQuery.data ?? []) as readonly LotteryEntry[]);
  const normalizedAddress = address ? getAddress(address) : undefined;
  const userEntryAmount = useMemo(() => {
    if (!normalizedAddress) return BigInt(0);

    return entries.reduce((total, entry) => {
      return getAddress(entry.player) === normalizedAddress ? total + entry.amount : total;
    }, BigInt(0));
  }, [entries, normalizedAddress]);

  const currentPool = currentPoolQuery.data ?? BigInt(0);
  const winProbability = currentPool > BigInt(0) ? (Number(userEntryAmount) / Number(currentPool)) * 100 : 0;
  const entryCount = entryCountQuery.data ?? BigInt(0);
  const maxEntries = maxEntriesQuery.data ?? BigInt(100);
  const minEntry = minEntryQuery.data ?? parseEther("10");
  const isRoundFull = entryCount >= maxEntries;
  const isBelowMinEntry = parsedEntryAmount !== undefined && entryAmountWei < minEntry;
  const readError =
    minEntryQuery.error ??
    maxEntriesQuery.error ??
    currentRoundQuery.error ??
    currentPoolQuery.error ??
    timeUntilDrawQuery.error ??
    entryCountQuery.error ??
    currentEntriesQuery.error ??
    frx.readError;
  const inputError =
    parsedEntryAmount === undefined
      ? "Enter a valid FRX amount."
      : isBelowMinEntry
        ? `Minimum entry is ${formatEther(minEntry)} FRX.`
        : isRoundFull
          ? "This lottery round is full. Wait for the next draw."
          : undefined;
  const txError = writeError ?? receiptError ?? frx.approvalError;
  const isLoading =
    minEntryQuery.isLoading ||
    maxEntriesQuery.isLoading ||
    currentRoundQuery.isLoading ||
    currentPoolQuery.isLoading ||
    timeUntilDrawQuery.isLoading ||
    entryCountQuery.isLoading ||
    currentEntriesQuery.isLoading ||
    frx.isLoading;

  const ensureReady = () => {
    if (!isConfigured) {
      throw new Error("FRX token and lottery addresses must be configured for this chain.");
    }

    if (readError) {
      throw new Error("Lottery state could not be read. Please retry before sending a transaction.");
    }

    if (inputError) {
      throw new Error(inputError);
    }
  };

  const approveEntry = () => {
    ensureReady();
    frx.approve(entryAmountWei);
  };

  const enter = () => {
    ensureReady();

    setTxChainId(chainId);
    writeContract({
      address: lotteryAddress,
      abi: frxLotteryAbi,
      functionName: "enter",
      args: [entryAmountWei],
    });
  };

  const drawWinner = () => {
    ensureReady();
    setTxChainId(chainId);
    writeContract({
      address: lotteryAddress,
      abi: frxLotteryAbi,
      functionName: "drawWinner",
    });
  };

  return {
    chain,
    lotteryAddress,
    isConnected: Boolean(address),
    isConfigured,
    currentRound: currentRoundQuery.data ?? BigInt(0),
    currentPool,
    currentPoolFormatted: formatEther(currentPool),
    entryCount,
    maxEntries,
    timeUntilDraw: timeUntilDrawQuery.data ?? BigInt(0),
    minEntry,
    minEntryFormatted: formatEther(minEntry),
    userEntryAmount,
    userEntryFormatted: formatEther(userEntryAmount),
    winProbability,
    isRoundFull,
    frxBalanceFormatted: frx.balanceFormatted,
    hasEntryAllowance: frx.hasAllowance,
    isApproving: frx.isApproving,
    isApprovalConfirmed: frx.isApprovalConfirmed,
    previousRound,
    previousWinner: previousWinnerQuery.data,
    previousPrize: previousPrizeQuery.data ?? BigInt(0),
    previousPrizeFormatted: formatEther(previousPrizeQuery.data ?? BigInt(0)),
    canDraw: (timeUntilDrawQuery.data ?? BigInt(0)) === BigInt(0) && entryCount > BigInt(0),
    isLoading,
    isTransacting: isWritePending || isConfirming,
    isConfirmed,
    readError,
    inputError,
    txError,
    approveEntry,
    enter,
    drawWinner,
  };
}

function parseTokenAmount(value: string) {
  try {
    return parseEther(value || "0");
  } catch {
    return undefined;
  }
}
