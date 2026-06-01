"use client";

import { Coins, Gem, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { NFTArtwork } from "@/components/nft/NFTArtwork";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { useFrontierPassToken } from "@/lib/contracts/hooks/useFrontierPass";
import { useFRXStaking, useStakedToken } from "@/lib/contracts/hooks/useFRXStaking";

export function StakedNFTList() {
  const { stakedTokens, isConnected, isConfigured, isLoading, readError, txError, claim, unstake, isTransacting } =
    useFRXStaking();

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Staked NFTs
        </p>
        <h2 className="mt-2 text-2xl font-bold">Reward positions</h2>
      </div>

      {!isConnected ? (
        <EmptyState
          title="Connect wallet to view positions"
          description="Your active staking positions will appear after connecting."
          action={<ConnectWalletButton />}
        />
      ) : null}

      {isConnected && !isConfigured ? (
        <EmptyState title="Staking address required" description="Configure contracts before reading staked NFTs." />
      ) : null}

      {isConnected && readError ? <EmptyState title="Could not read staked NFTs" description={readError.message} /> : null}

      {isConnected && isConfigured && !readError && isLoading ? <Loading label="Reading staked positions" /> : null}

      {isConnected && isConfigured && !readError && !isLoading && stakedTokens.length === 0 ? (
        <EmptyState title="No active staking positions" description="Approved and staked passes will appear here." />
      ) : null}

      {isConnected && isConfigured && !readError && stakedTokens.length > 0 ? (
        <div className="space-y-4">
          {stakedTokens.map((tokenId) => (
            <StakedTokenRow
              key={tokenId.toString()}
              tokenId={tokenId}
              claim={claim}
              unstake={unstake}
              isTransacting={isTransacting}
            />
          ))}
        </div>
      ) : null}
      {txError ? (
        <p className="mt-5 rounded-2xl border border-[rgba(239,68,68,0.35)] bg-white/[0.03] p-4 text-sm text-[var(--accent-red)]" aria-live="polite">
          {txError.message}
        </p>
      ) : null}
    </Card>
  );
}

function StakedTokenRow({
  tokenId,
  claim,
  unstake,
  isTransacting,
}: {
  tokenId: bigint;
  claim: (tokenId: bigint) => void;
  unstake: (tokenId: bigint) => void;
  isTransacting: boolean;
}) {
  const { rarityLabel, rarityIndex, dailyRate, pendingRewards, pendingRewardsFormatted, isLoading, error } =
    useStakedToken(tokenId);
  const { tokenUri } = useFrontierPassToken(tokenId);
  const canClaim = pendingRewards > BigInt(0) && !isTransacting;

  return (
    <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
      <div className="flex items-center gap-4">
        {tokenUri ? (
          <NFTArtwork
            tokenId={tokenId}
            tokenUri={tokenUri}
            rarityIndex={rarityIndex}
            revealed
            compact
            className="shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--glass-bg)]">
            <Gem className="h-6 w-6 text-[var(--accent-cyan)]" aria-hidden />
          </div>
        )}
        <div>
          <div className="font-[var(--font-orbitron)] text-lg font-bold">#{tokenId.toString()}</div>
          <p className="text-sm text-[var(--text-secondary)]">{isLoading ? "Reading..." : rarityLabel}</p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Daily Rate</p>
        <p className="mt-1 font-[var(--font-jetbrains-mono)] text-lg font-bold">{dailyRate} FRX/day</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Pending</p>
        <p className="mt-1 font-[var(--font-jetbrains-mono)] text-lg font-bold">
          {Number(pendingRewardsFormatted).toFixed(4)} FRX
        </p>
        {error ? <p className="mt-1 text-xs text-[var(--accent-red)]">{error.message}</p> : null}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" disabled={!canClaim} onClick={() => claim(tokenId)}>
          <Coins className="mr-2 h-4 w-4" aria-hidden />
          Claim
        </Button>
        <Button variant="ghost" disabled={isTransacting} onClick={() => unstake(tokenId)}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
          Unstake
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-6 text-center">
      <Gem className="mx-auto mb-4 h-9 w-9 text-[var(--accent-cyan)]" aria-hidden />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
