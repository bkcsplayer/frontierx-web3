"use client";

import { zeroAddress } from "viem";
import { useChainId } from "wagmi";
import { getChainConfig } from "@/lib/utils/chains";

export function useChainConfig() {
  const chainId = useChainId();
  const chain = getChainConfig(chainId);

  return {
    chain,
    chainId,
    isSupportedChain: Boolean(chain),
    hasFRXToken: Boolean(chain && chain.contracts.frxToken !== zeroAddress),
    hasFrontierPass: Boolean(chain && chain.contracts.frontierPass !== zeroAddress),
    hasStaking: Boolean(chain && chain.contracts.staking !== zeroAddress),
    hasLottery: Boolean(chain && chain.contracts.lottery !== zeroAddress),
    hasCrystalForge: Boolean(chain && chain.contracts.crystalForge !== zeroAddress),
  };
}
