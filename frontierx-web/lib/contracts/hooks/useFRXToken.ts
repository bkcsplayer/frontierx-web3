"use client";

import { useState } from "react";
import { formatEther, parseEther, zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { frxTokenAbi } from "@/lib/contracts/abis/frxToken";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";

export function useFRXToken(spender?: `0x${string}`, requiredAmount = "0") {
  const { address } = useAccount();
  const { chain, chainId, hasFRXToken, isSupportedChain } = useChainConfig();
  const [approvalChainId, setApprovalChainId] = useState<number | undefined>(undefined);
  const frxTokenAddress = chain?.contracts.frxToken ?? zeroAddress;
  const amountWei = parseEther(requiredAmount || "0");
  const canRead = isSupportedChain && hasFRXToken && Boolean(address);

  const balanceQuery = useReadContract({
    address: frxTokenAddress,
    abi: frxTokenAbi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    query: {
      enabled: canRead,
      refetchInterval: 10_000,
    },
  });

  const allowanceQuery = useReadContract({
    address: frxTokenAddress,
    abi: frxTokenAbi,
    functionName: "allowance",
    args: [address ?? zeroAddress, spender ?? zeroAddress],
    query: {
      enabled: canRead && Boolean(spender),
      refetchInterval: 10_000,
    },
  });

  const { writeContract, data: approveHash, error: approveError, isPending: isApprovePending } = useWriteContract();
  const {
    isLoading: isApproving,
    isSuccess: isApprovalConfirmed,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({
    chainId: approvalChainId,
    hash: approveHash,
    query: { enabled: Boolean(approveHash) },
  });

  const approve = (amount = amountWei) => {
    if (!spender) {
      throw new Error("Approval spender is not configured.");
    }

    if (!hasFRXToken) {
      throw new Error("FRX token address is not configured for this chain.");
    }

    setApprovalChainId(chainId);
    writeContract({
      address: frxTokenAddress,
      abi: frxTokenAbi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    frxTokenAddress,
    balance: balanceQuery.data ?? BigInt(0),
    balanceFormatted: formatEther(balanceQuery.data ?? BigInt(0)),
    allowance: allowanceQuery.data ?? BigInt(0),
    hasAllowance: (allowanceQuery.data ?? BigInt(0)) >= amountWei,
    isConfigured: isSupportedChain && hasFRXToken,
    isLoading: balanceQuery.isLoading || allowanceQuery.isLoading,
    readError: balanceQuery.error ?? allowanceQuery.error,
    approve,
    approveHash,
    isApproving: isApprovePending || isApproving,
    isApprovalConfirmed,
    approvalError: approveError ?? approvalReceiptError,
    refetchAllowance: allowanceQuery.refetch,
    refetchBalance: balanceQuery.refetch,
  };
}
