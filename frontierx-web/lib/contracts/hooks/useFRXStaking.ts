"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, getAddress, zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { frontierPassAbi } from "@/lib/contracts/abis/frontierPass";
import { frxStakingAbi } from "@/lib/contracts/abis/frxStaking";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { refetchAllSettled } from "@/lib/utils/query";
import { useFrontierPass } from "@/lib/contracts/hooks/useFrontierPass";

export const stakingRarityLabels = ["Common", "Rare", "Epic", "Legendary"] as const;
export const stakingDailyRates = ["100", "150", "250", "500"] as const;

export function useFRXStaking() {
  const { address } = useAccount();
  const { chain, chainId, hasFrontierPass, hasStaking, isSupportedChain } = useChainConfig();
  const { ownedTokens, revealed, isInventoryLoading, inventoryReadError, refetchInventory } = useFrontierPass();
  const stakingAddress = chain?.contracts.staking ?? zeroAddress;
  const frontierPassAddress = chain?.contracts.frontierPass ?? zeroAddress;
  const canReadStaking = isSupportedChain && hasFrontierPass && hasStaking && Boolean(address);
  const [txChainId, setTxChainId] = useState<number | undefined>(undefined);
  const refetchedHash = useRef<string | undefined>(undefined);

  const stakedTokensQuery = useReadContract({
    address: stakingAddress,
    abi: frxStakingAbi,
    functionName: "getStakedTokens",
    args: [address ?? zeroAddress],
    query: {
      enabled: canReadStaking,
      refetchInterval: 10_000,
    },
  });

  const totalPendingQuery = useReadContract({
    address: stakingAddress,
    abi: frxStakingAbi,
    functionName: "totalPendingRewards",
    args: [address ?? zeroAddress],
    query: {
      enabled: canReadStaking,
      refetchInterval: 10_000,
    },
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
      () => stakedTokensQuery.refetch(),
      () => totalPendingQuery.refetch(),
      () => refetchInventory(),
    );
  }, [chainId, isConfirmed, refetchInventory, stakedTokensQuery, totalPendingQuery, txChainId, txHash]);

  const readError = inventoryReadError ?? stakedTokensQuery.error ?? totalPendingQuery.error;
  const isConfigured = isSupportedChain && hasFrontierPass && hasStaking;
  const isLoading = isInventoryLoading || stakedTokensQuery.isLoading || totalPendingQuery.isLoading;

  const ensureConfigured = () => {
    if (!isConfigured) {
      throw new Error("FrontierPass and FRXStaking addresses must be configured for this chain.");
    }

    if (readError) {
      throw new Error("Staking state could not be read. Please retry before sending a transaction.");
    }
  };

  const approve = (tokenId: bigint) => {
    ensureConfigured();
    setTxChainId(chainId);
    writeContract({
      address: frontierPassAddress,
      abi: frontierPassAbi,
      functionName: "approve",
      args: [stakingAddress, tokenId],
    });
  };

  const stake = (tokenId: bigint) => {
    ensureConfigured();
    setTxChainId(chainId);
    writeContract({
      address: stakingAddress,
      abi: frxStakingAbi,
      functionName: "stake",
      args: [tokenId],
    });
  };

  const unstake = (tokenId: bigint) => {
    ensureConfigured();
    setTxChainId(chainId);
    writeContract({
      address: stakingAddress,
      abi: frxStakingAbi,
      functionName: "unstake",
      args: [tokenId],
    });
  };

  const claim = (tokenId: bigint) => {
    ensureConfigured();
    setTxChainId(chainId);
    writeContract({
      address: stakingAddress,
      abi: frxStakingAbi,
      functionName: "claim",
      args: [tokenId],
    });
  };

  const claimAll = () => {
    ensureConfigured();
    setTxChainId(chainId);
    writeContract({
      address: stakingAddress,
      abi: frxStakingAbi,
      functionName: "claimAll",
    });
  };

  return {
    chain,
    isConnected: Boolean(address),
    stakingAddress,
    frontierPassAddress,
    isConfigured,
    revealed,
    availableTokens: ownedTokens,
    stakedTokens: Array.from(stakedTokensQuery.data ?? []),
    totalPendingRewards: totalPendingQuery.data ?? BigInt(0),
    totalPendingRewardsFormatted: formatEther(totalPendingQuery.data ?? BigInt(0)),
    isLoading,
    readError,
    txHash,
    isTransacting: isWritePending || isConfirming,
    isConfirmed,
    txError: writeError ?? receiptError,
    error: writeError ?? receiptError ?? readError,
    approve,
    stake,
    unstake,
    claim,
    claimAll,
  };
}

export function useStakeApproval(tokenId: bigint) {
  const { chain, hasFrontierPass, hasStaking, isSupportedChain } = useChainConfig();
  const stakingAddress = chain?.contracts.staking ?? zeroAddress;
  const frontierPassAddress = chain?.contracts.frontierPass ?? zeroAddress;
  const isConfigured = isSupportedChain && hasFrontierPass && hasStaking;

  const approvedQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "getApproved",
    args: [tokenId],
    query: {
      enabled: isConfigured && tokenId > BigInt(0),
      refetchInterval: 10_000,
    },
  });

  const approvedAddress = approvedQuery.data ? getAddress(approvedQuery.data) : zeroAddress;

  return {
    isApproved: approvedAddress === stakingAddress,
    isLoading: approvedQuery.isLoading,
    error: approvedQuery.error,
    refetch: approvedQuery.refetch,
  };
}

export function useStakedToken(tokenId: bigint) {
  const { chain, hasFrontierPass, hasStaking, isSupportedChain } = useChainConfig();
  const stakingAddress = chain?.contracts.staking ?? zeroAddress;
  const isConfigured = isSupportedChain && hasFrontierPass && hasStaking;

  const stakeInfoQuery = useReadContract({
    address: stakingAddress,
    abi: frxStakingAbi,
    functionName: "stakes",
    args: [tokenId],
    query: {
      enabled: isConfigured && tokenId > BigInt(0),
    },
  });

  const pendingQuery = useReadContract({
    address: stakingAddress,
    abi: frxStakingAbi,
    functionName: "pendingRewards",
    args: [tokenId],
    query: {
      enabled: isConfigured && tokenId > BigInt(0),
      refetchInterval: 10_000,
    },
  });

  const rarityIndex = stakeInfoQuery.data ? Number(stakeInfoQuery.data[3]) : 0;

  return {
    tokenId,
    rarityIndex,
    rarityLabel: stakingRarityLabels[rarityIndex] ?? "Unknown",
    dailyRate: stakingDailyRates[rarityIndex] ?? "0",
    pendingRewards: pendingQuery.data ?? BigInt(0),
    pendingRewardsFormatted: formatEther(pendingQuery.data ?? BigInt(0)),
    isLoading: stakeInfoQuery.isLoading || pendingQuery.isLoading,
    error: stakeInfoQuery.error ?? pendingQuery.error,
  };
}
