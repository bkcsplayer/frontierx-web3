"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { zeroAddress } from "viem";
import { hardhat, sepolia } from "wagmi/chains";
import { useAccount, useChainId } from "wagmi";
import { getChainConfig } from "@/lib/utils/chains";

export function SepoliaDemoBanner() {
  const { t } = useTranslation();
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const sepoliaConfig = getChainConfig(sepolia.id);
  const hasSepoliaContracts = Boolean(
    sepoliaConfig?.contracts.frxToken && sepoliaConfig.contracts.frxToken !== zeroAddress,
  );

  if (!isConnected || !hasSepoliaContracts) {
    return null;
  }

  if (chainId === sepolia.id) {
    return null;
  }

  const isLocal = chainId === hardhat.id;

  return (
    <div
      role="status"
      className="relative z-50 border-b border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-center text-sm text-[var(--text-primary)]"
    >
      <p className="mx-auto flex max-w-4xl items-center justify-center gap-2 leading-6">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-gold)]" aria-hidden />
        <span>
          {isLocal ? t("network.localSepoliaHint") : t("network.wrongChainHint", { chain: getChainConfig(chainId)?.shortName ?? chainId })}
        </span>
      </p>
    </div>
  );
}
