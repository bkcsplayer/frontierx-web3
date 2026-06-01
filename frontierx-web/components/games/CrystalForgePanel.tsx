"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { CircleDollarSign, Gem, History, RotateCcw, ShieldAlert, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { forgeResultLabels, useCrystalForge, type ForgeHistoryRecord } from "@/lib/contracts/hooks/useCrystalForge";
import { shortenAddress } from "@/lib/utils/format";

const resultStyles = [
  "text-[var(--accent-red)]",
  "text-[var(--accent-green)]",
  "text-[var(--accent-gold)]",
  "text-[var(--accent-purple)]",
];

export function CrystalForgePanel() {
  const [actionError, setActionError] = useState<string | undefined>();
  const forge = useCrystalForge();
  const hasOpenRequest = Boolean(forge.trackedRequestId) && !forge.pendingSettled;
  const latestResult = forge.history[0];
  const latestResultLabel = latestResult ? forgeResultLabels[latestResult.result] : "IDLE";
  const visualState = hasOpenRequest ? "forging" : latestResultLabel.toLowerCase();
  const canApprove =
    forge.isConnected &&
    forge.isConfigured &&
    forge.isReady &&
    !forge.hasForgeAllowance &&
    !forge.readError &&
    !forge.isApproving &&
    !forge.isTransacting;
  const canRequest =
    forge.isConnected &&
    forge.isConfigured &&
    forge.isReady &&
    forge.hasForgeAllowance &&
    !hasOpenRequest &&
    !forge.readError &&
    !forge.isTransacting;
  const canSettle = forge.isConnected && forge.isConfigured && forge.canSettle && !forge.isTransacting;
  const canRefund = forge.isConnected && forge.isConfigured && forge.canRefund && !forge.isTransacting;

  const actionReason =
    forge.readError?.message ??
    (!forge.isConnected
      ? "Connect a wallet before forging."
      : !forge.isConfigured
        ? "Configure FRX token and CrystalForge addresses for this chain."
        : !forge.isReady
          ? "Crystal Forge cost, allowance, and history are still loading."
          : !forge.hasForgeAllowance
          ? "Approve 5 FRX before requesting a forge."
          : hasOpenRequest && forge.canSettle
            ? "Settle the pending forge request in a later block."
            : hasOpenRequest && forge.canRefund
              ? "This forge request expired and can be refunded."
              : hasOpenRequest
                ? "Waiting for a later block before settlement is valid."
                : "Ready to request a forge.");

  const runAction = (action: () => void) => {
    try {
      setActionError(undefined);
      action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Transaction could not be started.");
    }
  };

  return (
    <Card className="overflow-hidden p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.24em] text-[var(--accent-red)]">
            Crystal Forge
          </p>
          <h2 className="mt-3 text-3xl font-bold">Burn risk, chase upside</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Forge requests lock {forge.playCostFormatted || "5"} FRX, then settle in a later block
            for SHATTER, GLOW, BLAZE, or SUPERNOVA.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--text-secondary)]">
          FRX Balance:{" "}
          <span className="font-[var(--font-jetbrains-mono)] text-[var(--text-primary)]">
            {Number(forge.frxBalanceFormatted).toFixed(4)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.18),rgba(5,5,16,0.9)_62%)] p-6">
          <div className="flex min-h-[320px] flex-col items-center justify-center">
            <div className={`forge-crystal forge-crystal-${visualState}`} aria-hidden>
              <Gem className="h-28 w-28" />
            </div>
            <div className="mt-8 text-center">
              <p className="font-[var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">
                Latest outcome
              </p>
              <p className={`mt-2 font-[var(--font-orbitron)] text-3xl font-bold ${resultStyles[latestResult?.result ?? 1]}`}>
                {latestResultLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={CircleDollarSign} label="Cost" value={`${Number(forge.playCostFormatted).toFixed(2)} FRX`} />
            <Metric icon={Zap} label="Total Plays" value={forge.totalPlays.toString()} />
            <Metric icon={Sparkles} label="Paid Out" value={`${Number(forge.totalPaidOutFormatted).toFixed(2)} FRX`} />
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
            <h3 className="font-semibold">Outcomes</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["SHATTER", "50%", "0 FRX"],
                ["GLOW", "25%", "7.5 FRX"],
                ["BLAZE", "15%", "10 FRX"],
                ["SUPERNOVA", "10%", "15 FRX"],
              ].map(([label, probability, payout]) => (
                <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4">
                  <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{label}</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">
                    {probability} · {payout}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PendingForgeCard
            requestId={forge.trackedRequestId}
            requestBlock={forge.pendingRequestBlock}
            currentBlock={forge.currentBlock}
            paid={forge.pendingPaidFormatted}
            settled={forge.pendingSettled}
          />

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              {!forge.isConnected ? (
                <ConnectWalletButton />
              ) : !forge.hasForgeAllowance ? (
                <Button disabled={!canApprove} aria-describedby="forge-action-help" onClick={() => runAction(forge.approveForge)}>
                  {forge.isApproving ? <Loading label="Approving" className="text-white" /> : "Approve FRX"}
                </Button>
              ) : hasOpenRequest ? (
                <>
                  <Button disabled={!canSettle} aria-describedby="forge-action-help" onClick={() => runAction(forge.settleForge)}>
                    {forge.isTransacting ? <Loading label="Settling" className="text-white" /> : "Settle forge"}
                  </Button>
                  <Button variant="secondary" disabled={!canRefund} aria-describedby="forge-action-help" onClick={() => runAction(forge.refundExpiredForge)}>
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                    Refund expired
                  </Button>
                </>
              ) : (
                <Button disabled={!canRequest} aria-describedby="forge-action-help" onClick={() => runAction(forge.requestForge)}>
                  {forge.isTransacting ? <Loading label="Requesting" className="text-white" /> : "Forge crystal"}
                </Button>
              )}
            </div>
            <p id="forge-action-help" className="mt-3 text-xs text-[var(--text-muted)]">
              {actionReason}
            </p>
          </div>
        </div>
      </div>

      <ForgeHistory history={forge.history} />

      {forge.readError ? <Status message={forge.readError.message} /> : null}
      {forge.txError ? <Status message={forge.txError.message} /> : null}
      {actionError ? <Status message={actionError} /> : null}
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/[0.03] p-4">
      <Icon className="mb-4 h-5 w-5 text-[var(--accent-red)]" aria-hidden />
      <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function PendingForgeCard({
  requestId,
  requestBlock,
  currentBlock,
  paid,
  settled,
}: {
  requestId?: bigint;
  requestBlock: bigint;
  currentBlock: bigint;
  paid: string;
  settled: boolean;
}) {
  if (!requestId) {
    return (
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
        <h3 className="font-semibold">Pending request</h3>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">No forge request is currently tracked in this session.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
      <h3 className="font-semibold">Pending request #{requestId.toString()}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Paid" value={`${Number(paid).toFixed(2)} FRX`} />
        <MiniStat label="Request Block" value={requestBlock.toString()} />
        <MiniStat label="Current Block" value={currentBlock.toString()} />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Status: {settled ? "settled" : "open"} · refunds unlock after request block + 256.
      </p>
    </div>
  );
}

function ForgeHistory({ history }: { history: ForgeHistoryRecord[] }) {
  return (
    <div className="mt-8 rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-[var(--accent-cyan)]" aria-hidden />
        <h3 className="font-semibold">Recent forges</h3>
      </div>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">No forge history yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {history.map((record, index) => (
            <div
              key={`${record.player}-${record.timestamp.toString()}-${index}`}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-[var(--font-jetbrains-mono)] text-sm text-[var(--text-muted)]">
                  {shortenAddress(record.player)}
                </span>
                <span className={`ml-3 font-semibold ${resultStyles[record.result]}`}>
                  {forgeResultLabels[record.result] ?? "UNKNOWN"}
                </span>
              </div>
              <span className="font-[var(--font-jetbrains-mono)] text-sm">
                +{Number(formatEther(record.payout)).toFixed(4)} FRX
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-black/20 p-4">
      <div className="font-[var(--font-jetbrains-mono)] text-lg font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function Status({ message }: { message: string }) {
  return (
    <div
      className="mt-5 flex gap-3 rounded-2xl border border-[rgba(239,68,68,0.35)] bg-white/[0.03] p-4 text-sm text-[var(--accent-red)]"
      aria-live="polite"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-6">{message}</p>
    </div>
  );
}

