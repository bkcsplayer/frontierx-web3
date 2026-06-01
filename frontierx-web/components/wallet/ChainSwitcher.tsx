"use client";

import { ChevronDown } from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { chainConfig, supportedChains, type SupportedChainId } from "@/lib/utils/chains";

export function ChainSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const activeConfig = chainConfig[chainId as SupportedChainId];

  return (
    <label className="relative inline-flex h-10 items-center rounded-full border border-[var(--border-default)] bg-[var(--glass-bg)] pl-4 pr-9 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition hover:border-[var(--border-strong)]">
      <span className="sr-only">Select network</span>
      <select
        value={activeConfig ? chainId : ""}
        disabled={isPending}
        onChange={(event) => switchChain({ chainId: Number(event.target.value) })}
        className="appearance-none bg-transparent pr-1 text-[var(--text-primary)] outline-none disabled:opacity-60"
      >
        {!activeConfig ? <option value="">Unsupported</option> : null}
        {supportedChains.map((chain) => (
          <option key={chain.id} value={chain.id} className="bg-[#050510] text-white">
            {chainConfig[chain.id].shortName}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--accent-cyan)]" aria-hidden />
    </label>
  );
}
