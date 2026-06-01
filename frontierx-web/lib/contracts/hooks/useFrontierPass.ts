"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, parseEther, zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { frontierPassAbi } from "@/lib/contracts/abis/frontierPass";
import { frxStakingAbi } from "@/lib/contracts/abis/frxStaking";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { refetchAllSettled } from "@/lib/utils/query";

export const rarityLabels = ["Common", "Rare", "Epic", "Legendary"] as const;

export function useFrontierPass() {
  const { address } = useAccount();
  const refetchedMintHash = useRef<string | undefined>(undefined);
  const [mintChainId, setMintChainId] = useState<number | undefined>(undefined);
  const { chain, chainId, hasFrontierPass, hasStaking, isSupportedChain } = useChainConfig();
  const frontierPassAddress = chain?.contracts.frontierPass ?? zeroAddress;
  const stakingAddress = chain?.contracts.staking ?? zeroAddress;
  const canReadPass = isSupportedChain && hasFrontierPass;
  const canReadAccount = canReadPass && Boolean(address);

  const totalSupplyQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "totalSupply",
    query: { enabled: canReadPass },
  });

  const maxSupplyQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "MAX_SUPPLY",
    query: { enabled: canReadPass },
  });

  const mintPriceQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "mintPrice",
    query: { enabled: canReadPass },
  });

  const revealedQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "revealed",
    query: { enabled: canReadPass },
  });

  const holdsPassQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "holdsPass",
    args: [address ?? zeroAddress],
    query: { enabled: canReadAccount },
  });

  const ownedTokensQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "tokensOfOwner",
    args: [address ?? zeroAddress],
    query: { enabled: canReadAccount },
  });

  const effectivePassHolderQuery = useReadContract({
    address: stakingAddress,
    abi: frxStakingAbi,
    functionName: "effectivePassHolder",
    args: [address ?? zeroAddress],
    query: { enabled: canReadAccount && hasStaking },
  });

  const { writeContract, data: mintHash, error: mintError, isPending: isMintPending } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isMintConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    chainId: mintChainId,
    hash: mintHash,
    query: { enabled: Boolean(mintHash) },
  });

  useEffect(() => {
    if (!isMintConfirmed || !mintHash || mintChainId !== chainId || refetchedMintHash.current === mintHash) return;

    refetchedMintHash.current = mintHash;
    void refetchAllSettled(
      () => totalSupplyQuery.refetch(),
      () => ownedTokensQuery.refetch(),
      () => holdsPassQuery.refetch(),
      () => effectivePassHolderQuery.refetch(),
    );
  }, [chainId, effectivePassHolderQuery, holdsPassQuery, isMintConfirmed, mintChainId, mintHash, ownedTokensQuery, totalSupplyQuery]);

  const configuredMintPrice = chain?.mintPrice ?? "0";
  const mintPriceWei = mintPriceQuery.data ?? parseEther(configuredMintPrice);
  const mintReadError =
    totalSupplyQuery.error ?? maxSupplyQuery.error ?? mintPriceQuery.error ?? revealedQuery.error;
  const gateReadError = holdsPassQuery.error ?? effectivePassHolderQuery.error;
  const inventoryReadError = ownedTokensQuery.error ?? revealedQuery.error;
  const readError = mintReadError ?? gateReadError ?? inventoryReadError;
  const isMintStateLoading =
    totalSupplyQuery.isLoading ||
    maxSupplyQuery.isLoading ||
    mintPriceQuery.isLoading ||
    revealedQuery.isLoading;
  const isGateLoading = holdsPassQuery.isLoading || effectivePassHolderQuery.isLoading;
  const isInventoryLoading = ownedTokensQuery.isLoading || revealedQuery.isLoading;

  const mint = () => {
    if (!canReadPass) {
      throw new Error("FrontierPass contract address is not configured for this chain.");
    }

    if (mintReadError) {
      throw new Error("FrontierPass state could not be read. Please retry before minting.");
    }

    setMintChainId(chainId);
    writeContract({
      address: frontierPassAddress,
      abi: frontierPassAbi,
      functionName: "mint",
      value: mintPriceWei,
    });
  };

  return {
    chain,
    address,
    isSupportedChain,
    isConfigured: canReadPass,
    isGateConfigured: canReadPass && hasStaking,
    totalSupply: totalSupplyQuery.data ? Number(totalSupplyQuery.data) : 0,
    maxSupply: maxSupplyQuery.data ? Number(maxSupplyQuery.data) : 100,
    mintPrice: formatEther(mintPriceWei),
    nativeCurrency: chain?.nativeCurrency ?? "ETH",
    revealed: Boolean(revealedQuery.data),
    holdsWalletPass: Boolean(holdsPassQuery.data),
    hasPassAccess: Boolean(holdsPassQuery.data || effectivePassHolderQuery.data),
    ownedTokens: Array.from(ownedTokensQuery.data ?? []),
    refetchInventory: ownedTokensQuery.refetch,
    isLoading: isMintStateLoading || isGateLoading || isInventoryLoading,
    isMintStateLoading,
    isGateLoading,
    isInventoryLoading,
    mint,
    mintHash,
    isMinting: isMintPending || isConfirming,
    isMintConfirmed,
    mintReadError,
    gateReadError,
    inventoryReadError,
    error: mintError ?? receiptError ?? readError,
  };
}

export function useFrontierPassToken(tokenId: bigint) {
  const { chain, hasFrontierPass } = useChainConfig();
  const frontierPassAddress = chain?.contracts.frontierPass ?? zeroAddress;
  const enabled = hasFrontierPass && tokenId > BigInt(0);

  const rarityQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "tokenRarity",
    args: [tokenId],
    query: { enabled },
  });

  const tokenUriQuery = useReadContract({
    address: frontierPassAddress,
    abi: frontierPassAbi,
    functionName: "tokenURI",
    args: [tokenId],
    query: { enabled },
  });

  const rarityIndex = Number(rarityQuery.data ?? 0) as 0 | 1 | 2 | 3;

  return {
    tokenId,
    rarityIndex,
    rarityLabel: rarityLabels[rarityIndex] ?? "Unknown",
    tokenUri: tokenUriQuery.data ?? "",
    isLoading: rarityQuery.isLoading || tokenUriQuery.isLoading,
  };
}
