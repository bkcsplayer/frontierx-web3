import { base, hardhat, polygon, sepolia } from "wagmi/chains";
import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import type { ContractAddresses, SupportedChainId } from "@/lib/utils/chains";

function envAddress(value?: string): Address {
  return value && isAddress(value) ? getAddress(value) : zeroAddress;
}

export const contractAddresses: Record<SupportedChainId, ContractAddresses> = {
  [hardhat.id]: {
    frxToken: envAddress(process.env.NEXT_PUBLIC_LOCAL_FRX_TOKEN_ADDRESS),
    frontierPass: envAddress(process.env.NEXT_PUBLIC_LOCAL_FRONTIER_PASS_ADDRESS),
    staking: envAddress(process.env.NEXT_PUBLIC_LOCAL_FRX_STAKING_ADDRESS),
    lottery: envAddress(process.env.NEXT_PUBLIC_LOCAL_FRX_LOTTERY_ADDRESS),
    crystalForge: envAddress(process.env.NEXT_PUBLIC_LOCAL_CRYSTAL_FORGE_ADDRESS),
  },
  [sepolia.id]: {
    frxToken: envAddress(process.env.NEXT_PUBLIC_SEPOLIA_FRX_TOKEN_ADDRESS),
    frontierPass: envAddress(process.env.NEXT_PUBLIC_SEPOLIA_FRONTIER_PASS_ADDRESS),
    staking: envAddress(process.env.NEXT_PUBLIC_SEPOLIA_FRX_STAKING_ADDRESS),
    lottery: envAddress(process.env.NEXT_PUBLIC_SEPOLIA_FRX_LOTTERY_ADDRESS),
    crystalForge: envAddress(process.env.NEXT_PUBLIC_SEPOLIA_CRYSTAL_FORGE_ADDRESS),
  },
  [polygon.id]: {
    frxToken: envAddress(process.env.NEXT_PUBLIC_POLYGON_FRX_TOKEN_ADDRESS),
    frontierPass: envAddress(process.env.NEXT_PUBLIC_POLYGON_FRONTIER_PASS_ADDRESS),
    staking: envAddress(process.env.NEXT_PUBLIC_POLYGON_FRX_STAKING_ADDRESS),
    lottery: envAddress(process.env.NEXT_PUBLIC_POLYGON_FRX_LOTTERY_ADDRESS),
    crystalForge: envAddress(process.env.NEXT_PUBLIC_POLYGON_CRYSTAL_FORGE_ADDRESS),
  },
  [base.id]: {
    frxToken: envAddress(process.env.NEXT_PUBLIC_BASE_FRX_TOKEN_ADDRESS),
    frontierPass: envAddress(process.env.NEXT_PUBLIC_BASE_FRONTIER_PASS_ADDRESS),
    staking: envAddress(process.env.NEXT_PUBLIC_BASE_FRX_STAKING_ADDRESS),
    lottery: envAddress(process.env.NEXT_PUBLIC_BASE_FRX_LOTTERY_ADDRESS),
    crystalForge: envAddress(process.env.NEXT_PUBLIC_BASE_CRYSTAL_FORGE_ADDRESS),
  },
};
