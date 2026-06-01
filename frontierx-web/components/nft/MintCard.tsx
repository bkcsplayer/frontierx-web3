"use client";

import { CheckCircle2, Gem, ShieldAlert, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ChainSwitcher } from "@/components/wallet/ChainSwitcher";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { useFrontierPass } from "@/lib/contracts/hooks/useFrontierPass";

const rarityChances = [
  ["Common", "60%", "text-[var(--accent-cyan)]"],
  ["Rare", "25%", "text-[var(--accent-purple)]"],
  ["Epic", "10%", "text-[var(--accent-gold)]"],
  ["Legendary", "5%", "text-[var(--accent-green)]"],
];

export function MintCard() {
  const { isConnected } = useAccount();
  const {
    chain,
    totalSupply,
    maxSupply,
    mintPrice,
    nativeCurrency,
    ownedTokens,
    revealed,
    isConfigured,
    isMintStateLoading,
    mintReadError,
    isMinting,
    isMintConfirmed,
    error,
    mint,
  } = useFrontierPass();

  const isSoldOut = totalSupply >= maxSupply;
  const isMintDisabled =
    !isConnected || !isConfigured || isMintStateLoading || Boolean(mintReadError) || isMinting || isSoldOut || revealed;
  const supplyPercent = maxSupply > 0 ? Math.min(100, (totalSupply / maxSupply) * 100) : 0;

  const buttonLabel = (() => {
    if (!isConnected) return "Connect wallet first";
    if (!isConfigured) return "Configure contract address";
    if (isMintStateLoading) return "Reading contract state";
    if (mintReadError) return "Contract read failed";
    if (revealed) return "Sale closed after reveal";
    if (isSoldOut) return "Sold out";
    if (isMinting) return "Minting...";
    return "Mint now";
  })();

  return (
    <Card className="overflow-hidden p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.2),rgba(5,5,16,0.94)_64%)]">
          <div className="absolute inset-6 rounded-3xl border border-white/10" aria-hidden />
          <div className="absolute left-8 top-8 rounded-full border border-[var(--border-default)] bg-black/30 px-3 py-1 font-[var(--font-jetbrains-mono)] text-xs text-[var(--accent-cyan)]">
            ERC-721
          </div>
          <div className="text-center">
            <Gem className="mx-auto h-20 w-20 text-[var(--accent-cyan)] drop-shadow-[0_0_32px_rgba(6,182,212,0.5)]" aria-hidden />
            <h2 className="mt-8 font-[var(--font-orbitron)] text-3xl font-bold uppercase tracking-[0.12em]">
              Frontier Access Pass
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-[var(--text-secondary)]">
              A limited access credential for staking rewards, game entry, and AI agent utility.
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
                Mint Console
              </p>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Mint your pass</h2>
            </div>
            <ChainSwitcher />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric label="Price" value={`${mintPrice} ${nativeCurrency}`} />
            <Metric label="Supply" value={`${totalSupply} / ${maxSupply}`} />
            <Metric label="Your NFTs" value={ownedTokens.length.toString()} />
          </div>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Minted supply"
            aria-valuenow={totalSupply}
            aria-valuemin={0}
            aria-valuemax={maxSupply}
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-cyan),var(--accent-purple))]"
              style={{ width: `${supplyPercent}%` }}
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {rarityChances.map(([label, chance, color]) => (
              <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
                <div className={`font-[var(--font-jetbrains-mono)] text-xl font-bold ${color}`}>{chance}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isConnected ? (
              <Button className="w-full sm:w-auto" disabled={isMintDisabled} onClick={mint}>
                {isMinting ? <Loading label="Minting" className="text-white" /> : buttonLabel}
              </Button>
            ) : (
              <ConnectWalletButton />
            )}
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" aria-hidden />
              {chain?.name ?? "Unsupported chain"}
            </div>
          </div>

          {!isConfigured ? (
            <Status tone="warning" message="This chain is ready in the UI, but its FrontierPass address is not set yet." />
          ) : null}
          {isMintConfirmed ? <Status tone="success" message="Mint confirmed. Your NFT list will refresh shortly." /> : null}
          {error ? <Status tone="error" message={error.message} /> : null}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
      <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function Status({ tone, message }: { tone: "success" | "warning" | "error"; message: string }) {
  const toneClass = {
    success: "border-[rgba(16,185,129,0.35)] text-[var(--accent-green)]",
    warning: "border-[rgba(245,158,11,0.35)] text-[var(--accent-gold)]",
    error: "border-[rgba(239,68,68,0.35)] text-[var(--accent-red)]",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : ShieldAlert;

  return (
    <div className={`mt-5 flex gap-3 rounded-2xl border bg-white/[0.03] p-4 text-sm ${toneClass}`} aria-live="polite">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-6">{message}</p>
    </div>
  );
}
