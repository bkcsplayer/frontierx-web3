"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther, parseAbiItem, zeroAddress, type Address, type Hash, type PublicClient } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";
import { crystalForgeAbi } from "@/lib/contracts/abis/crystalForge";
import { frontierPassAbi } from "@/lib/contracts/abis/frontierPass";
import { frxLotteryAbi } from "@/lib/contracts/abis/frxLottery";
import { frxStakingAbi } from "@/lib/contracts/abis/frxStaking";
import { frxTokenAbi } from "@/lib/contracts/abis/frxToken";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { chainConfig, supportedChains } from "@/lib/utils/chains";
import { shortenAddress } from "@/lib/utils/format";
import { isAbortLikeError, refetchAllSettled } from "@/lib/utils/query";

export type DashboardActivity = {
  id: string;
  label: string;
  detail: string;
  tone: "green" | "cyan" | "gold" | "red" | "purple";
  blockNumber: bigint;
  logIndex: number;
  timestamp?: number;
};

const eventScanBlocks = parseEventScanBlocks(process.env.NEXT_PUBLIC_DASHBOARD_EVENT_BLOCKS);
const tokenAddress = (address?: Address) => address ?? zeroAddress;

export function useProtocolDashboard() {
  const { chain, chainId, hasCrystalForge, hasFRXToken, hasFrontierPass, hasLottery, hasStaking, isSupportedChain } =
    useChainConfig();
  const publicClient = usePublicClient({ chainId });
  const contracts = chain?.contracts;

  const frxToken = tokenAddress(contracts?.frxToken);
  const frontierPass = tokenAddress(contracts?.frontierPass);
  const staking = tokenAddress(contracts?.staking);
  const lottery = tokenAddress(contracts?.lottery);
  const crystalForge = tokenAddress(contracts?.crystalForge);
  const isDashboardReady = isSupportedChain && hasFRXToken && hasFrontierPass;

  const statsQuery = useReadContracts({
    contracts: [
      {
        address: frxToken,
        abi: frxTokenAbi,
        functionName: "treasuryBalance",
      },
      {
        address: frxToken,
        abi: frxTokenAbi,
        functionName: "totalBurned",
      },
      {
        address: frxToken,
        abi: frxTokenAbi,
        functionName: "totalMinted",
      },
      {
        address: frxToken,
        abi: frxTokenAbi,
        functionName: "circulatingSupply",
      },
      {
        address: frontierPass,
        abi: frontierPassAbi,
        functionName: "totalSupply",
      },
      {
        address: frontierPass,
        abi: frontierPassAbi,
        functionName: "MAX_SUPPLY",
      },
      {
        address: frontierPass,
        abi: frontierPassAbi,
        functionName: "balanceOf",
        args: [staking],
      },
      {
        address: staking,
        abi: frxStakingAbi,
        functionName: "BASE_RATE",
      },
      {
        address: lottery,
        abi: frxLotteryAbi,
        functionName: "currentRound",
      },
      {
        address: lottery,
        abi: frxLotteryAbi,
        functionName: "currentPool",
      },
      {
        address: lottery,
        abi: frxLotteryAbi,
        functionName: "currentEntryCount",
      },
      {
        address: crystalForge,
        abi: crystalForgeAbi,
        functionName: "totalPlays",
      },
      {
        address: crystalForge,
        abi: crystalForgeAbi,
        functionName: "totalPaidOut",
      },
    ],
    query: {
      enabled: isDashboardReady,
      refetchInterval: 30_000,
    },
  });

  const stats = useMemo(() => {
    const data = statsQuery.data;
    return {
      treasuryBalance: readBigInt(data, 0),
      totalBurned: readBigInt(data, 1),
      totalMinted: readBigInt(data, 2),
      circulatingSupply: readBigInt(data, 3),
      nftMinted: readBigInt(data, 4),
      nftMaxSupply: readBigInt(data, 5, BigInt(100)),
      nftStaked: readBigInt(data, 6),
      baseRate: readBigInt(data, 7),
      lotteryRound: readBigInt(data, 8, BigInt(1)),
      lotteryPool: readBigInt(data, 9),
      lotteryEntries: readBigInt(data, 10),
      forgePlays: readBigInt(data, 11),
      forgePaidOut: readBigInt(data, 12),
    };
  }, [statsQuery.data]);

  const activityQuery = useQuery({
    queryKey: [
      "dashboard-activity",
      chainId,
      frxToken,
      frontierPass,
      staking,
      lottery,
      crystalForge,
      eventScanBlocks.toString(),
    ],
    enabled: Boolean(publicClient && isDashboardReady && contracts),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!publicClient || !contracts) return [];
      try {
        return await getRecentActivity(publicClient, contracts, eventScanBlocks);
      } catch (error) {
        if (isAbortLikeError(error)) return [];
        throw error;
      }
    },
  });

  const chainStatuses = supportedChains.map((supportedChain) => {
    const config = chainConfig[supportedChain.id];
    const configuredContracts = Object.values(config.contracts).filter((address) => address !== zeroAddress).length;

    return {
      id: supportedChain.id,
      name: supportedChain.name,
      active: supportedChain.id === chainId,
      configuredContracts,
    };
  });

  return {
    chain,
    chainId,
    isSupportedChain,
    hasFRXToken,
    hasFrontierPass,
    hasStaking,
    hasLottery,
    hasCrystalForge,
    isDashboardReady,
    stats,
    activity: activityQuery.data ?? [],
    chainStatuses,
    isLoading: statsQuery.isLoading || activityQuery.isLoading,
    error: isDashboardReady ? statsQuery.error ?? activityQuery.error : undefined,
    refetch: () => {
      void refetchAllSettled(() => statsQuery.refetch(), () => activityQuery.refetch());
    },
  };
}

async function getRecentActivity(
  publicClient: PublicClient,
  contracts: {
    frxToken: Address;
    frontierPass: Address;
    staking: Address;
    lottery: Address;
    crystalForge: Address;
  },
  scanBlocks: bigint,
) {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > scanBlocks ? latestBlock - scanBlocks : BigInt(0);
  const activities: DashboardActivity[] = [];

  const eventQueries: Array<Promise<DashboardActivity[]>> = [
    contracts.frontierPass !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.frontierPass,
            event: parseAbiItem("event NFTMinted(address indexed to, uint256 tokenId)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.to)} minted Pass #${log.args.tokenId?.toString()}`,
              detail: "FrontierPass mint",
              tone: "green" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
    contracts.staking !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.staking,
            event: parseAbiItem("event Staked(address indexed owner, uint256 tokenId, uint8 rarity)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.owner)} staked Pass #${log.args.tokenId?.toString()}`,
              detail: `Rarity tier ${log.args.rarity?.toString() ?? "unknown"}`,
              tone: "cyan" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
    contracts.staking !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.staking,
            event: parseAbiItem("event Claimed(address indexed owner, uint256 amount)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.owner)} claimed ${formatFRX(log.args.amount ?? BigInt(0))} FRX`,
              detail: "Staking rewards",
              tone: "gold" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
    contracts.frxToken !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.frxToken,
            event: parseAbiItem("event TokensBurned(address indexed from, uint256 amount)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.from)} burned ${formatFRX(log.args.amount ?? BigInt(0))} FRX`,
              detail: "Token sink",
              tone: "red" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
    contracts.lottery !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.lottery,
            event: parseAbiItem("event WinnerDrawn(uint256 round, address indexed winner, uint256 prize, uint256 treasury)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.winner)} won Round ${log.args.round?.toString()}`,
              detail: `${formatFRX(log.args.prize ?? BigInt(0))} FRX prize`,
              tone: "green" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
    contracts.crystalForge !== zeroAddress
      ? publicClient
          .getLogs({
            address: contracts.crystalForge,
            event: parseAbiItem("event CrystalForged(address indexed player, uint8 result, uint256 payout, uint256 playIndex)"),
            fromBlock,
            toBlock: latestBlock,
          })
          .then((logs) =>
            logs.map((log) => ({
              id: logId(log.transactionHash, log.logIndex),
              label: `${shortenAddress(log.args.player)} forged ${forgeResult(log.args.result ?? 0)}`,
              detail: `${formatFRX(log.args.payout ?? BigInt(0))} FRX payout`,
              tone: "purple" as const,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
            })),
          )
      : Promise.resolve([]),
  ];

  const eventResults = await Promise.allSettled(eventQueries);
  activities.push(
    ...eventResults.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
  const latestActivities = activities
    .sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
      return a.blockNumber > b.blockNumber ? -1 : 1;
    })
    .slice(0, 8);
  const blockTimestamps = await getBlockTimestamps(publicClient, latestActivities.map((activity) => activity.blockNumber));

  return latestActivities.map((activity) => ({
    ...activity,
    timestamp: blockTimestamps.get(activity.blockNumber.toString()),
  }));
}

async function getBlockTimestamps(publicClient: PublicClient, blockNumbers: bigint[]) {
  const uniqueBlockNumbers = Array.from(new Set(blockNumbers.map((blockNumber) => blockNumber.toString()))).slice(0, 8);
  const blocks = await Promise.all(
    uniqueBlockNumbers.map((blockNumber) => publicClient.getBlock({ blockNumber: BigInt(blockNumber) })),
  );
  return new Map(blocks.map((block) => [block.number.toString(), Number(block.timestamp)]));
}

function readBigInt(
  data: readonly { result?: unknown; status: "success" | "failure" }[] | undefined,
  index: number,
  fallback = BigInt(0),
) {
  const value = data?.[index]?.result;
  return typeof value === "bigint" ? value : fallback;
}

function logId(transactionHash: Hash, logIndex: number) {
  return `${transactionHash}-${logIndex}`;
}

function formatFRX(value: bigint) {
  const numeric = Number(formatEther(value));
  if (!Number.isFinite(numeric)) return formatEther(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(numeric);
}

function forgeResult(result: number) {
  return ["SHATTER", "GLOW", "BLAZE", "SUPERNOVA"][result] ?? "UNKNOWN";
}

function parseEventScanBlocks(value?: string) {
  const parsed = Number(value ?? "5000");
  if (!Number.isFinite(parsed) || parsed <= 0) return BigInt(5000);
  return BigInt(Math.min(Math.floor(parsed), 20000));
}
