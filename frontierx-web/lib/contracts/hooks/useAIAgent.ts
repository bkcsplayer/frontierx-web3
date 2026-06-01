"use client";

import { useMemo, useState } from "react";
import { formatEther, getAddress, parseEther, zeroAddress, type Address, type Hash, type Hex } from "viem";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import { buildAIRequestMessage, hashPayload } from "@/lib/api/ai-request-message";
import { frxTokenAbi } from "@/lib/contracts/abis/frxToken";
import { useChainConfig } from "@/lib/contracts/hooks/useChainConfig";
import { useFRXToken } from "@/lib/contracts/hooks/useFRXToken";
import { voidRefetch } from "@/lib/utils/query";

export type AIAgentType = "scout" | "content" | "distill";

export type AIAgentPayload = {
  scout: { query: string };
  content: { topic: string; platform: "linkedin" | "twitter" | "wechat" | "xiaohongshu" };
  distill: { text: string };
};

export type AIAgentStage = "idle" | "burning" | "confirming" | "signing" | "calling" | "success" | "error";

export type AIAgentResult = {
  result: string;
  model?: string;
  provider?: string;
  tokensUsed?: number;
  txHash: Hash;
};

export type PendingAIRequest<TPayload> = {
  agentType: AIAgentType;
  route: string;
  chainId: number;
  txHash: Hash;
  walletAddress: Address;
  payload: TPayload;
  payloadHash: Hash;
};

const AGENT_COSTS: Record<AIAgentType, `${number}`> = {
  scout: "10",
  content: "10",
  distill: "15",
};

export function useAIAgent<TAgent extends AIAgentType>(agentType: TAgent) {
  const { address, isConnected } = useAccount();
  const { chain, chainId, hasFRXToken, isSupportedChain } = useChainConfig();
  const publicClient = usePublicClient({ chainId });
  const frx = useFRXToken();
  const { writeContractAsync, isPending: isBurnPromptOpen } = useWriteContract();
  const { signMessageAsync, isPending: isSignaturePromptOpen } = useSignMessage();
  const [stage, setStage] = useState<AIAgentStage>("idle");
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<AIAgentResult | undefined>();
  const [pendingRequest, setPendingRequest] = useState<PendingAIRequest<AIAgentPayload[TAgent]> | undefined>();

  const cost = AGENT_COSTS[agentType];
  const costWei = useMemo(() => parseEther(cost), [cost]);
  const hasEnoughBalance = frx.balance >= costWei;
  const frxTokenAddress = chain?.contracts.frxToken ?? zeroAddress;
  const isConfigured = isSupportedChain && hasFRXToken && frxTokenAddress !== zeroAddress;
  const isBusy =
    stage === "burning" ||
    stage === "confirming" ||
    stage === "signing" ||
    stage === "calling" ||
    isBurnPromptOpen ||
    isSignaturePromptOpen;

  const execute = async (payload: AIAgentPayload[TAgent]) => {
    if (!address || !isConnected) {
      setError("Connect a wallet before launching an AI agent.");
      setStage("error");
      return;
    }

    if (!isConfigured) {
      setError("FRX token address is not configured for this chain.");
      setStage("error");
      return;
    }

    if (!publicClient) {
      setError("No public client is available for the active chain.");
      setStage("error");
      return;
    }

    if (!hasEnoughBalance) {
      setError(`Insufficient FRX balance. This agent costs ${cost} FRX.`);
      setStage("error");
      return;
    }

    setError(undefined);
    setResult(undefined);

    try {
      const walletAddress = getAddress(address);
      const route = `/api/ai/${agentType}`;
      ensurePayloadFitsRequestLimit({ route, chainId, walletAddress, payload });
      await ensurePaidAIReady();

      setStage("burning");
      const txHash = await writeContractAsync({
        address: frxTokenAddress,
        abi: frxTokenAbi,
        functionName: "burn",
        args: [costWei],
        account: walletAddress,
        chainId,
      });

      setStage("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("FRX burn transaction failed.");
      }

      const payloadHash = hashPayload(payload);
      const request = {
        agentType,
        route,
        chainId,
        txHash,
        walletAddress,
        payload,
        payloadHash,
      };
      setPendingRequest(request);
      await signAndSubmit(request);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI agent request failed.");
      setStage("error");
    }
  };

  const retryPending = async () => {
    if (!pendingRequest) return;
    setError(undefined);
    setResult(undefined);

    try {
      await ensurePaidAIReady();
      await signAndSubmit(pendingRequest);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI agent request failed.");
      setStage("error");
    }
  };

  const signAndSubmit = async (request: PendingAIRequest<AIAgentPayload[TAgent]>) => {
      setStage("signing");
      const expiresAt = Date.now() + 5 * 60_000;
      const nonce = crypto.randomUUID();
      const signature = await signMessageAsync({
        message: buildAIRequestMessage({
          route: request.route,
          chainId: request.chainId,
          txHash: request.txHash,
          walletAddress: request.walletAddress,
          payloadHash: request.payloadHash,
          nonce,
          expiresAt,
        }),
      });

      setStage("calling");
      const response = await fetch(request.route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: request.txHash,
          chainId: request.chainId,
          walletAddress: request.walletAddress,
          payload: request.payload,
          nonce,
          expiresAt,
          signature: signature as Hex,
        }),
      });
      const data = (await response.json().catch(() => undefined)) as
        | {
            success?: boolean;
            result?: string;
            error?: string;
            model?: string;
            provider?: string;
            tokensUsed?: number;
          }
        | undefined;

      if (!response.ok || !data?.success || typeof data.result !== "string") {
        throw new Error(data?.error || "AI agent request failed.");
      }

      setResult({
        result: data.result,
        model: data.model,
        provider: data.provider,
        tokensUsed: data.tokensUsed,
        txHash: request.txHash,
      });
      setPendingRequest(undefined);
      setStage("success");
      voidRefetch(frx.refetchBalance);
  };

  return {
    execute,
    retryPending,
    pendingRequest,
    result,
    error,
    stage,
    cost,
    costWei,
    balance: frx.balance,
    balanceFormatted: formatEther(frx.balance),
    hasEnoughBalance,
    isBusy,
    isConfigured,
    readError: frx.readError,
  };
}

async function ensurePaidAIReady() {
  const response = await fetch("/api/ai/status", { method: "GET" });
  const data = (await response.json().catch(() => undefined)) as
    | { burnConsumptionReady?: boolean; error?: string }
    | undefined;

  if (!response.ok || !data?.burnConsumptionReady) {
    throw new Error(data?.error || "Paid AI requests are not available right now.");
  }
}

function ensurePayloadFitsRequestLimit({
  route,
  chainId,
  walletAddress,
  payload,
}: {
  route: string;
  chainId: number;
  walletAddress: Address;
  payload: unknown;
}) {
  const estimatedRequest = {
    txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    chainId,
    walletAddress,
    payload,
    nonce: "00000000-0000-4000-8000-000000000000",
    expiresAt: Date.now() + 5 * 60_000,
    signature:
      "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  };
  const bytes = new TextEncoder().encode(JSON.stringify(estimatedRequest)).byteLength;

  if (bytes > 32_000) {
    throw new Error(`The ${route} request is too large. Shorten the input before burning FRX.`);
  }
}
