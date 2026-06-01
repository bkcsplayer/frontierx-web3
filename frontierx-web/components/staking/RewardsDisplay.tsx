"use client";

import { Coins, Radio, WalletCards, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { useFRXStaking } from "@/lib/contracts/hooks/useFRXStaking";

export function RewardsDisplay() {
  const {
    stakedTokens,
    isConnected,
    totalPendingRewards,
    totalPendingRewardsFormatted,
    isConfigured,
    isLoading,
    readError,
    txError,
    isTransacting,
    claimAll,
  } = useFRXStaking();

  const canClaim = isConnected && isConfigured && !readError && totalPendingRewards > BigInt(0) && !isTransacting;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricCard icon={WalletCards} label="Total Staked" value={`${stakedTokens.length} NFTs`} />
      <MetricCard
        icon={Coins}
        label="Pending Rewards"
        value={isLoading ? "Reading..." : `${Number(totalPendingRewardsFormatted).toFixed(4)} FRX`}
      />
      <MetricCard icon={Radio} label="Total Earned" value="Event index pending" />

      <Card className="p-6 lg:col-span-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Claim rewards</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Pending FRX refreshes every 10 seconds while this page is open.
            </p>
          </div>
          {isConnected ? (
            <Button disabled={!canClaim} onClick={claimAll}>
              {isTransacting ? <Loading label="Confirming" className="text-white" /> : "Claim all"}
            </Button>
          ) : (
            <ConnectWalletButton />
          )}
        </div>
        {isConnected && !isConfigured ? (
          <p className="mt-4 text-sm text-[var(--accent-gold)]">
            Configure FrontierPass and FRXStaking addresses before claiming.
          </p>
        ) : null}
        {readError ? <p className="mt-4 text-sm text-[var(--accent-red)]">{readError.message}</p> : null}
        {txError ? (
          <p className="mt-4 text-sm text-[var(--accent-red)]" aria-live="polite">
            {txError.message}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-6">
      <Icon className="mb-5 h-7 w-7 text-[var(--accent-cyan)]" aria-hidden />
      <div className="font-[var(--font-jetbrains-mono)] text-2xl font-bold">{value}</div>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">{label}</div>
    </Card>
  );
}
