"use client";

import { Gem, ShieldCheck, ShieldPlus } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { useFRXStaking, useStakeApproval } from "@/lib/contracts/hooks/useFRXStaking";
import { useFrontierPassToken } from "@/lib/contracts/hooks/useFrontierPass";
import { voidRefetch } from "@/lib/utils/query";

export function StakePanel() {
  const {
    availableTokens,
    isConnected,
    isConfigured,
    revealed,
    isLoading,
    readError,
    txHash,
    isConfirmed,
    txError,
    approve,
    stake,
    isTransacting,
  } = useFRXStaking();

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Available To Stake
          </p>
          <h2 className="mt-2 text-2xl font-bold">Wallet passes</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Approval and staking are intentionally separate transactions.
        </p>
      </div>

      {!isConnected ? (
        <EmptyState
          title="Connect wallet to stake"
          description="Your wallet-held Frontier Passes will appear here after connecting."
          action={<ConnectWalletButton />}
        />
      ) : null}

      {isConnected && !isConfigured ? (
        <EmptyState
          title="Staking is not configured"
          description="Set FrontierPass and FRXStaking addresses for the active chain before staking."
        />
      ) : null}

      {isConnected && readError ? <EmptyState title="Could not read staking state" description={readError.message} /> : null}

      {isConnected && isConfigured && !readError && !revealed ? (
        <EmptyState
          title="Passes are not revealed yet"
          description="The staking contract rejects staking until FrontierPass.revealed() is true."
        />
      ) : null}

      {isConnected && isConfigured && !readError && revealed && isLoading ? <Loading label="Reading available passes" /> : null}

      {isConnected && isConfigured && !readError && revealed && !isLoading && availableTokens.length === 0 ? (
        <EmptyState
          title="No wallet-held passes"
          description="Mint a pass or unstake one before it appears in this available list."
        />
      ) : null}

      {isConnected && isConfigured && !readError && revealed && availableTokens.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableTokens.map((tokenId) => (
            <AvailableStakeCard
              key={tokenId.toString()}
              tokenId={tokenId}
              txHash={txHash}
              isConfirmed={isConfirmed}
              approve={approve}
              stake={stake}
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

function AvailableStakeCard({
  tokenId,
  txHash,
  isConfirmed,
  approve,
  stake,
  isTransacting,
}: {
  tokenId: bigint;
  txHash?: `0x${string}`;
  isConfirmed: boolean;
  approve: (tokenId: bigint) => void;
  stake: (tokenId: bigint) => void;
  isTransacting: boolean;
}) {
  const { rarityLabel, isLoading: isTokenLoading } = useFrontierPassToken(tokenId);
  const { isApproved, isLoading: isApprovalLoading, error: approvalError, refetch } = useStakeApproval(tokenId);

  useEffect(() => {
    if (!isConfirmed || !txHash) return;
    voidRefetch(refetch);
  }, [isConfirmed, refetch, txHash]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-[var(--font-orbitron)] text-xl font-bold">#{tokenId.toString()}</div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isTokenLoading ? "Reading rarity..." : rarityLabel}
          </p>
        </div>
        {isApproved ? (
          <ShieldCheck className="h-6 w-6 text-[var(--accent-green)]" aria-label="Approved" />
        ) : (
          <ShieldPlus className="h-6 w-6 text-[var(--accent-gold)]" aria-label="Approval required" />
        )}
      </div>

      {approvalError ? <p className="mt-4 text-sm text-[var(--accent-red)]">{approvalError.message}</p> : null}

      <div className="mt-5 flex gap-3">
        {!isApproved ? (
          <Button
            className="flex-1"
            variant="secondary"
            disabled={isApprovalLoading || isTransacting}
            onClick={() => approve(tokenId)}
          >
            {isTransacting ? <Loading label="Confirming" /> : "Approve"}
          </Button>
        ) : (
          <Button className="flex-1" disabled={isTransacting} onClick={() => stake(tokenId)}>
            {isTransacting ? <Loading label="Staking" className="text-white" /> : "Stake"}
          </Button>
        )}
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
