import { base, hardhat, polygon, sepolia } from "wagmi/chains";
import type { Address } from "viem";
import { contractAddresses } from "@/lib/contracts/addresses";

export const supportedChains = [hardhat, sepolia, polygon, base] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export type ContractAddresses = {
  frxToken: Address;
  frontierPass: Address;
  staking: Address;
  lottery: Address;
  crystalForge: Address;
};

export type ChainConfig = {
  name: string;
  shortName: string;
  mintPrice: string;
  nativeCurrency: string;
  rpcUrl: string;
  contracts: ContractAddresses;
};

export const chainConfig: Record<SupportedChainId, ChainConfig> = {
  [hardhat.id]: {
    name: "Local Hardhat",
    shortName: "Local",
    mintPrice: "0.003",
    nativeCurrency: "ETH",
    rpcUrl: process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:9831",
    contracts: contractAddresses[hardhat.id],
  },
  [sepolia.id]: {
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    mintPrice: "0.003",
    nativeCurrency: "ETH",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    contracts: contractAddresses[sepolia.id],
  },
  [polygon.id]: {
    name: "Polygon PoS",
    shortName: "Polygon",
    mintPrice: "10",
    nativeCurrency: "MATIC",
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com",
    contracts: contractAddresses[polygon.id],
  },
  [base.id]: {
    name: "Base",
    shortName: "Base",
    mintPrice: "0.003",
    nativeCurrency: "ETH",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    contracts: contractAddresses[base.id],
  },
};

export function getChainConfig(chainId?: number) {
  if (!chainId || !(chainId in chainConfig)) {
    return undefined;
  }

  return chainConfig[chainId as SupportedChainId];
}
